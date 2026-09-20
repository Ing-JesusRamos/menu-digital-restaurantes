import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/client";
import { clientSessions, orders, tableSessions } from "@/lib/db/schema";
import { hashToken } from "@/lib/security/tokens";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id: tableSessionId } = await context.params;
  const clientToken = request.headers.get("x-client-session-token");

  if (!clientToken) {
    return NextResponse.json({ error: "x-client-session-token is required" }, { status: 400 });
  }

  const db = getDatabase();
  const [session] = await db
    .select({ clientSession: clientSessions, tableSession: tableSessions })
    .from(clientSessions)
    .innerJoin(tableSessions, eq(clientSessions.tableSessionId, tableSessions.id))
    .where(
      and(
        eq(clientSessions.tokenHash, hashToken(clientToken)),
        eq(clientSessions.tableSessionId, tableSessionId),
        isNull(clientSessions.invalidatedAt),
      ),
    )
    .limit(1);

  if (!session) {
    return NextResponse.json({ error: "Invalid client session" }, { status: 401 });
  }

  const ownOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.clientSessionId, session.clientSession.id))
    .orderBy(orders.createdAt);

  const tableOrders = await db
    .select({ totalCents: orders.totalCents })
    .from(orders)
    .where(eq(orders.tableSessionId, tableSessionId));

  return NextResponse.json({
    tableSession: {
      id: session.tableSession.id,
      status: session.tableSession.status,
      openedAt: session.tableSession.openedAt,
      closedAt: session.tableSession.closedAt,
      totalCents: tableOrders.reduce((total, order) => total + order.totalCents, 0),
    },
    ownOrders,
  });
}
