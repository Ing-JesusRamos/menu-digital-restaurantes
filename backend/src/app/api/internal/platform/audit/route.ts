import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { authorizePlatformActor } from "@/lib/auth/authorization";
import { getDatabase } from "@/lib/db/client";
import { auditEvents } from "@/lib/db/schema";

export async function GET(request: Request) {
  const access = await authorizePlatformActor(request, "platform.read");
  if ("response" in access) return access.response;
  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") ?? 50), 100);
  const events = await getDatabase().select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(limit);
  return NextResponse.json({ events });
}
