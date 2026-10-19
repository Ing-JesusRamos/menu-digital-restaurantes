import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireRestaurantContext } from "@/lib/auth/restaurant-context";
import { getDatabase } from "@/lib/db/client";
import { clientSessions, orders, tableSessions } from "@/lib/db/schema";
import { recordAuditEvent } from "@/lib/audit/events";

type RouteContext = {
  params: Promise<{ slug: string; sessionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { slug, sessionId } = await context.params;
  const auth = await requireRestaurantContext(request, slug, "table_sessions.close");
  if ("response" in auth) return auth.response;

  const db = getDatabase();
  const result = await db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(tableSessions)
      .where(and(eq(tableSessions.id, sessionId), eq(tableSessions.restaurantId, auth.restaurant.id)))
      .limit(1);

    if (!session) return { kind: "not-found" as const };
    if (session.status !== "open") return { kind: "already-closed" as const, session };

    const [closed] = await tx
      .update(tableSessions)
      .set({ status: "closed", closedAt: new Date() })
      .where(and(eq(tableSessions.id, session.id), eq(tableSessions.status, "open")))
      .returning();

    await tx
      .update(clientSessions)
      .set({ invalidatedAt: new Date() })
      .where(and(eq(clientSessions.tableSessionId, session.id), isNull(clientSessions.invalidatedAt)));

    return { kind: "closed" as const, session: closed };
  });

  if (result.kind === "not-found") {
    return NextResponse.json({ error: "Table session not found" }, { status: 404 });
  }

  if (result.kind === "already-closed") {
    return NextResponse.json({ session: result.session, alreadyClosed: true });
  }

  await recordAuditEvent(db, {
    actorUserId: auth.actor.userId,
    action: "table_session.closed",
    entityType: "table_session",
    entityId: sessionId,
    restaurantId: auth.restaurant.id,
    after: { status: "closed", closedAt: result.session?.closedAt },
  });

  const tableOrders = await db
    .select({ totalCents: orders.totalCents })
    .from(orders)
    .where(eq(orders.tableSessionId, sessionId));

  return NextResponse.json({
    session: result.session,
    totalCents: tableOrders.reduce((total, order) => total + order.totalCents, 0),
    closed: true,
  });
}
