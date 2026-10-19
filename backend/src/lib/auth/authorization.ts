import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/client";
import {
  permissions,
  platformRoleAssignments,
  platformRoles,
  restaurantMemberships,
  userProfiles,
} from "@/lib/db/schema";
import { getSupabaseUser } from "@/lib/auth/supabase-server";

export type Actor = {
  userId: string;
  status: string;
  platformRoles: string[];
  restaurantMembership?: {
    restaurantId: string;
    role: string;
    status: string;
  };
};

const rolePermissions: Record<string, string[]> = {
  restaurant_admin: [
    "orders.read",
    "tables.manage",
    "table_sessions.close",
    "catalog.manage",
    "catalog.price.update",
    "availability.manage",
    "users.request",
  ],
  waiter: [
    "orders.read",
    "orders.create",
    "orders.edit",
    "tables.read",
    "table_sessions.close",
  ],
  kitchen: ["orders.read", "orders.status.update", "availability.manage"],
};

export async function getActor(request: Request): Promise<Actor | null> {
  const user = await getSupabaseUser(request);
  if (!user) return null;

  const db = getDatabase();
  const userId = user.id;
  const [profile] = await db
    .select({ id: userProfiles.id, status: userProfiles.status })
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);

  if (!profile) return null;

  const assignments = await db
    .select({ role: platformRoles.name })
    .from(platformRoleAssignments)
    .innerJoin(platformRoles, eq(platformRoleAssignments.roleId, platformRoles.id))
    .where(eq(platformRoleAssignments.userId, userId));

  return {
    userId: profile.id,
    status: profile.status,
    platformRoles: assignments.map((assignment) => assignment.role),
  };
}

export async function authorizeRestaurantActor(
  request: Request,
  restaurantId: string,
  permission: string,
) {
  const actor = await getActor(request);
  if (!actor || actor.status !== "active") {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  }

  const db = getDatabase();
  const [membership] = await db
    .select({ restaurantId: restaurantMemberships.restaurantId, role: restaurantMemberships.role, status: restaurantMemberships.status })
    .from(restaurantMemberships)
    .where(
      and(
        eq(restaurantMemberships.userId, actor.userId),
        eq(restaurantMemberships.restaurantId, restaurantId),
      ),
    )
    .limit(1);

  if (!membership || membership.status !== "active") {
    return { response: NextResponse.json({ error: "Restaurant access denied" }, { status: 403 }) } as const;
  }

  const allowed = rolePermissions[membership.role]?.includes(permission) ?? false;
  if (!allowed) {
    return { response: NextResponse.json({ error: "Permission denied" }, { status: 403 }) } as const;
  }

  return { actor: { ...actor, restaurantMembership: membership } } as const;
}

export function permissionFromDatabaseIsReservedForFutureExpansion() {
  return permissions;
}

const platformRolePermissions: Record<string, string[]> = {
  superadmin_principal: ["platform.read", "platform.requests.review", "platform.users.manage", "platform.restaurants.manage", "platform.support.elevate"],
  superadmin_auxiliary: ["platform.read", "platform.requests.review"],
};

export async function authorizePlatformActor(request: Request, permission: string) {
  const actor = await getActor(request);
  if (!actor || actor.status !== "active") {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  }

  const allowed = actor.platformRoles.some((role) => platformRolePermissions[role]?.includes(permission));
  if (!allowed) {
    return { response: NextResponse.json({ error: "Platform access denied" }, { status: 403 }) } as const;
  }

  return { actor } as const;
}

export async function requireAuthenticatedActor(request: Request) {
  const actor = await getActor(request);
  if (!actor || actor.status !== "active") {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  }
  return { actor } as const;
}
