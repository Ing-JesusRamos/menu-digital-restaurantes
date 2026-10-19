import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizePlatformActor } from "@/lib/auth/authorization";
import { getDatabase } from "@/lib/db/client";
import { restaurants } from "@/lib/db/schema";

const createRestaurantSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
const statusSchema = z.object({ status: z.enum(["active", "deactivation_pending", "inactive"]) });

export async function GET(request: Request) {
  const access = await authorizePlatformActor(request, "platform.read");
  if ("response" in access) return access.response;

  const db = getDatabase();
  const result = await db.select().from(restaurants).orderBy(asc(restaurants.name));
  return NextResponse.json({ restaurants: result });
}

export async function POST(request: Request) {
  const access = await authorizePlatformActor(request, "platform.restaurants.manage");
  if ("response" in access) return access.response;
  const parsed = createRestaurantSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Nombre o slug inválido" }, { status: 400 });

  const db = getDatabase();
  const [created] = await db.insert(restaurants).values(parsed.data).returning();
  return NextResponse.json({ restaurant: created }, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await authorizePlatformActor(request, "platform.restaurants.manage");
  if ("response" in access) return access.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Restaurant id is required" }, { status: 400 });
  const parsed = statusSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

  const db = getDatabase();
  const values = parsed.data.status === "deactivation_pending"
    ? { status: parsed.data.status, deactivatedAt: new Date() }
    : { status: parsed.data.status };
  const [updated] = await db.update(restaurants).set(values).where(eq(restaurants.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  return NextResponse.json({ restaurant: updated });
}
