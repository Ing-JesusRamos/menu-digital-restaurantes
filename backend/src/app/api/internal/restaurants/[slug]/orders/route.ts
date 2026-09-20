import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db/client";
import { requireRestaurantContext } from "@/lib/auth/restaurant-context";
import { orders, restaurantTables, tableSessions } from "@/lib/db/schema";

const statusSchema = z.enum(["submitted", "preparing", "ready", "delivered"]);

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireRestaurantContext(request, slug);
  if ("response" in auth) return auth.response;

  const status = new URL(request.url).searchParams.get("status");
  const parsedStatus = status ? statusSchema.safeParse(status) : null;
  if (parsedStatus && !parsedStatus.success) {
    return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
  }

  const db = getDatabase();
  const conditions = [eq(orders.restaurantId, auth.restaurant.id)];
  if (parsedStatus?.success) conditions.push(eq(orders.status, parsedStatus.data));

  const result = await db
    .select({ order: orders, tableSession: tableSessions, table: restaurantTables })
    .from(orders)
    .innerJoin(tableSessions, eq(orders.tableSessionId, tableSessions.id))
    .innerJoin(restaurantTables, eq(tableSessions.tableId, restaurantTables.id))
    .where(and(...conditions))
    .orderBy(asc(orders.createdAt));

  return NextResponse.json({
    orders: result.map(({ order, tableSession, table }) => ({
      ...order,
      table: { id: table.id, label: table.label },
      tableSession: { id: tableSession.id, status: tableSession.status },
    })),
  });
}
