import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizePlatformActor } from "@/lib/auth/authorization";
import { getDatabase } from "@/lib/db/client";
import { administrativeRequests, restaurants, userProfiles } from "@/lib/db/schema";
import { recordAudit } from "@/lib/audit/record";

const statusSchema = z.object({ status: z.enum(["approved", "rejected"]), reason: z.string().trim().min(3).max(500) });

export async function GET(request: Request) {
  const access = await authorizePlatformActor(request, "platform.read");
  if ("response" in access) return access.response;

  const db = getDatabase();
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");
  const conditions = [
    status ? eq(administrativeRequests.status, status) : undefined,
    type ? eq(administrativeRequests.type, type) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const requests = await db
    .select({
      id: administrativeRequests.id,
      type: administrativeRequests.type,
      status: administrativeRequests.status,
      payload: administrativeRequests.payload,
      reason: administrativeRequests.reason,
      createdAt: administrativeRequests.createdAt,
      restaurantName: restaurants.name,
      requestedBy: userProfiles.displayName,
    })
    .from(administrativeRequests)
    .where(conditions.length ? and(...conditions) : undefined)
    .leftJoin(restaurants, eq(administrativeRequests.restaurantId, restaurants.id))
    .leftJoin(userProfiles, eq(administrativeRequests.requestedByUserId, userProfiles.id))
    .orderBy(desc(administrativeRequests.createdAt));

  return NextResponse.json({ requests });
}

export async function PATCH(request: Request) {
  const access = await authorizePlatformActor(request, "platform.requests.review");
  if ("response" in access) return access.response;

  const url = new URL(request.url);
  const requestId = url.searchParams.get("id");
  if (!requestId) return NextResponse.json({ error: "Request id is required" }, { status: 400 });
  const parsed = statusSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Estado y motivo son obligatorios" }, { status: 400 });

  const db = getDatabase();
  const [current] = await db.select().from(administrativeRequests).where(eq(administrativeRequests.id, requestId)).limit(1);
  if (!current) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (current.status !== "pending") return NextResponse.json({ error: "Only pending requests can be reviewed" }, { status: 409 });

  const [updated] = await db
    .update(administrativeRequests)
    .set({ status: parsed.data.status, reviewedByUserId: access.actor.userId, reviewedAt: new Date(), reason: parsed.data.reason })
    .where(eq(administrativeRequests.id, requestId))
    .returning({ id: administrativeRequests.id, status: administrativeRequests.status });

  await recordAudit({ actorUserId: access.actor.userId, action: `ADMIN_REQUEST_${parsed.data.status.toUpperCase()}`, entityType: "administrative_request", entityId: requestId, restaurantId: current.restaurantId ?? undefined, before: current, after: updated, reason: parsed.data.reason, requestId });
  return NextResponse.json({ request: updated });
}
