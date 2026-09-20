import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRestaurantContext } from "@/lib/auth/restaurant-context";
import { getDatabase } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";

const statusSchema = z.object({
  status: z.enum(["submitted", "preparing", "ready", "delivered"]),
});

const transitions: Record<string, string[]> = {
  submitted: ["submitted", "preparing"],
  preparing: ["preparing", "ready"],
  ready: ["ready", "delivered"],
  delivered: ["delivered"],
};

type RouteContext = {
  params: Promise<{ slug: string; orderId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { slug, orderId } = await context.params;
  const auth = await requireRestaurantContext(request, slug);
  if ("response" in auth) return auth.response;

  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = getDatabase();
  const [current] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.restaurantId, auth.restaurant.id)))
    .limit(1);

  if (!current) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!transitions[current.status]?.includes(parsed.data.status)) {
    return NextResponse.json(
      { error: `Cannot change order from ${current.status} to ${parsed.data.status}` },
      { status: 409 },
    );
  }

  const [updated] = await db
    .update(orders)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(and(eq(orders.id, current.id), eq(orders.status, current.status)))
    .returning();

  return NextResponse.json({ order: updated ?? current });
}
