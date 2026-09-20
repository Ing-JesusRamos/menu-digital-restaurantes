import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db/client";
import { clientSessions, restaurantTables, restaurants, tableSessions } from "@/lib/db/schema";
import { createOpaqueToken, hashToken, verifyTableCode } from "@/lib/security/tokens";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(32),
});

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  const rate = consumeRateLimit(`table-validation:${slug}:${ip}`, { limit: 10, windowMs: 5 * 60 * 1000 });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many table validation attempts", retryAfterSeconds: rate.retryAfterSeconds },
      { status: 429, headers: { "retry-after": String(rate.retryAfterSeconds) } },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid table code" }, { status: 400 });
  }

  const db = getDatabase();
  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.slug, slug)).limit(1);

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const candidateTables = await db
    .select()
    .from(restaurantTables)
    .where(eq(restaurantTables.restaurantId, restaurant.id));

  const table = candidateTables.find(
    (candidate) => candidate.active && verifyTableCode(parsed.data.code, candidate.codeHash),
  );

  if (!table) {
    return NextResponse.json({ error: "Invalid table code" }, { status: 401 });
  }

  const result = await db.transaction(async (tx) => {
    // Serialize validations for this table so concurrent clients join one session.
    await tx.execute(sql`SELECT id FROM restaurant_tables WHERE id = ${table.id} FOR UPDATE`);

    const [openSession] = await tx
      .select()
      .from(tableSessions)
      .where(and(eq(tableSessions.tableId, table.id), eq(tableSessions.status, "open")))
      .limit(1);

    const tableSession = openSession
      ?? (await tx
          .insert(tableSessions)
          .values({ restaurantId: restaurant.id, tableId: table.id, status: "open" })
          .returning())[0];

    const clientToken = createOpaqueToken();
    const [clientSession] = await tx
      .insert(clientSessions)
      .values({
        restaurantId: restaurant.id,
        tableSessionId: tableSession.id,
        tokenHash: hashToken(clientToken),
      })
      .returning({ id: clientSessions.id });

    return { tableSession, clientSessionId: clientSession.id, clientToken };
  });

  return NextResponse.json(
    {
      tableSessionId: result.tableSession.id,
      clientSessionId: result.clientSessionId,
      clientSessionToken: result.clientToken,
      table: { id: table.id, label: table.label },
      status: result.tableSession.status,
    },
    { headers: { "x-ratelimit-remaining": String(rate.remaining) } },
  );
}

