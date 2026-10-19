import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/authorization";

export async function GET(request: Request) {
  const actor = await getActor(request);
  if (!actor || actor.status !== "active") {
    return NextResponse.json({ error: "Authenticated active profile required" }, { status: 403 });
  }

  const isPlatform = actor.platformRoles.includes("superadmin_principal") || actor.platformRoles.includes("superadmin_auxiliary");
  const destination = isPlatform ? "/platform" : actor.restaurantMembership ? "/admin/users" : "/login";
  return NextResponse.json({ actor, destination });
}
