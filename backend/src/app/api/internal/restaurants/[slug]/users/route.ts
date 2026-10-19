import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRestaurantContext } from "@/lib/auth/restaurant-context";
import { getDatabase } from "@/lib/db/client";
import { administrativeRequests, restaurantMemberships, userProfiles } from "@/lib/db/schema";

const createUserRequestSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  role: z.enum(["restaurant_admin", "waiter", "kitchen"]),
  reason: z.string().trim().max(500).optional(),
});

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const access = await requireRestaurantContext(request, slug, "users.request");
  if ("response" in access) return access.response;

  const db = getDatabase();
  const users = await db
    .select({
      id: userProfiles.id,
      displayName: userProfiles.displayName,
      phone: userProfiles.phone,
      status: userProfiles.status,
      role: restaurantMemberships.role,
      membershipStatus: restaurantMemberships.status,
      createdAt: userProfiles.createdAt,
    })
    .from(restaurantMemberships)
    .innerJoin(userProfiles, eq(restaurantMemberships.userId, userProfiles.id))
    .where(eq(restaurantMemberships.restaurantId, access.restaurant.id))
    .orderBy(desc(userProfiles.createdAt));

  return NextResponse.json({ restaurant: access.restaurant, users });
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const access = await requireRestaurantContext(request, slug, "users.request");
  if ("response" in access) return access.response;

  const parsed = createUserRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid user request", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDatabase();
  const [created] = await db
    .insert(administrativeRequests)
    .values({
      type: "CREATE_USER",
      requestedByUserId: access.actor.userId,
      restaurantId: access.restaurant.id,
      payload: parsed.data,
      reason: parsed.data.reason,
      status: "pending",
    })
    .returning({ id: administrativeRequests.id, status: administrativeRequests.status, createdAt: administrativeRequests.createdAt });

  return NextResponse.json({ request: created }, { status: 202 });
}
