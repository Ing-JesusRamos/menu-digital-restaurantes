import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/client";
import { restaurants } from "@/lib/db/schema";
import { authorizeRestaurantActor } from "@/lib/auth/authorization";

/**
 * Temporary local-development guard. Replace with Supabase Auth membership
 * validation before exposing operational endpoints outside development.
 */
export async function requireRestaurantContext(
  request: Request,
  slug: string,
  permission = "orders.read",
) {
  const db = getDatabase();
  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.slug, slug)).limit(1);

  if (!restaurant) {
    return { response: NextResponse.json({ error: "Restaurant not found" }, { status: 404 }) } as const;
  }

  if (restaurant.status !== "active") {
    return { response: NextResponse.json({ error: "Restaurant is not active" }, { status: 409 }) } as const;
  }

  const authorization = await authorizeRestaurantActor(request, restaurant.id, permission);
  if ("response" in authorization) return { response: authorization.response } as const;

  return { restaurant, actor: authorization.actor } as const;
}
