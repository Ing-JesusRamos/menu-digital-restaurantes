import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/client";
import { restaurants } from "@/lib/db/schema";

/**
 * Temporary local-development guard. Replace with Supabase Auth membership
 * validation before exposing operational endpoints outside development.
 */
export async function requireRestaurantContext(request: Request, slug: string) {
  if (process.env.NODE_ENV !== "development") {
    return {
      response: NextResponse.json(
        { error: "Restaurant authentication is not configured" },
        { status: 501 },
      ),
    } as const;
  }

  const requestedSlug = request.headers.get("x-development-restaurant-slug");
  if (!requestedSlug || requestedSlug !== slug) {
    return {
      response: NextResponse.json({ error: "Invalid development restaurant context" }, { status: 401 }),
    } as const;
  }

  const db = getDatabase();
  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.slug, slug)).limit(1);

  if (!restaurant) {
    return { response: NextResponse.json({ error: "Restaurant not found" }, { status: 404 }) } as const;
  }

  return { restaurant } as const;
}
