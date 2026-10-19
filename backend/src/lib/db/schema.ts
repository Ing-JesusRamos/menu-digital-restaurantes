import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const restaurants = pgTable("restaurants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").default("active").notNull(),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  deletionEligibleAt: timestamp("deletion_eligible_at", { withTimezone: true }),
  ...timestamps,
});

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull(),
  identificationType: text("identification_type"),
  identificationValue: text("identification_value"),
  phone: text("phone"),
  status: text("status").default("pending").notNull(),
  ...timestamps,
});

export const restaurantMemberships = pgTable(
  "restaurant_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "restrict" }),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
    status: text("status").default("pending").notNull(),
    ...timestamps,
  },
  (table) => [unique("restaurant_memberships_user_unique").on(table.userId)],
);

export const platformRoles = pgTable(
  "platform_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    description: text("description"),
    ...timestamps,
  },
);

export const platformRoleAssignments = pgTable(
  "platform_role_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "restrict" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => platformRoles.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [unique("platform_role_assignments_user_role_unique").on(table.userId, table.roleId)],
);

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
});

export const platformRolePermissions = pgTable(
  "platform_role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => platformRoles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [unique("platform_role_permissions_unique").on(table.roleId, table.permissionId)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [unique("categories_restaurant_slug_unique").on(table.restaurantId, table.slug)],
);

export const dishes = pgTable(
  "dishes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    imageUrl: text("image_url"),
    available: boolean("available").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [unique("dishes_restaurant_slug_unique").on(table.restaurantId, table.slug)],
);

export const ingredients = pgTable(
  "ingredients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    available: boolean("available").default(true).notNull(),
    ...timestamps,
  },
  (table) => [unique("ingredients_restaurant_name_unique").on(table.restaurantId, table.name)],
);

export const dishIngredients = pgTable(
  "dish_ingredients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    dishId: uuid("dish_id")
      .notNull()
      .references(() => dishes.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    includedByDefault: boolean("included_by_default").default(true).notNull(),
    removable: boolean("removable").default(true).notNull(),
  },
  (table) => [unique("dish_ingredients_unique").on(table.dishId, table.ingredientId)],
);

export const extras = pgTable(
  "extras",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull(),
    available: boolean("available").default(true).notNull(),
    ...timestamps,
  },
  (table) => [unique("extras_restaurant_name_unique").on(table.restaurantId, table.name)],
);

export const dishExtras = pgTable(
  "dish_extras",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    dishId: uuid("dish_id")
      .notNull()
      .references(() => dishes.id, { onDelete: "cascade" }),
    extraId: uuid("extra_id")
      .notNull()
      .references(() => extras.id, { onDelete: "cascade" }),
    maxQuantity: integer("max_quantity").default(99).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [unique("dish_extras_unique").on(table.dishId, table.extraId)],
);

export const restaurantTables = pgTable(
  "restaurant_tables",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    codeHash: text("code_hash").notNull(),
    active: boolean("active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [unique("restaurant_tables_restaurant_label_unique").on(table.restaurantId, table.label)],
);

export const tableSessions = pgTable("table_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  tableId: uuid("table_id")
    .notNull()
    .references(() => restaurantTables.id, { onDelete: "restrict" }),
  status: text("status").default("open").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const clientSessions = pgTable("client_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  tableSessionId: uuid("table_session_id")
    .notNull()
    .references(() => tableSessions.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "restrict" }),
    tableSessionId: uuid("table_session_id")
      .notNull()
      .references(() => tableSessions.id, { onDelete: "restrict" }),
    clientSessionId: uuid("client_session_id")
      .notNull()
      .references(() => clientSessions.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status").default("submitted").notNull(),
    source: text("source").default("client").notNull(),
    currentVersion: integer("current_version").default(1).notNull(),
    items: jsonb("items").notNull(),
    totalCents: integer("total_cents").notNull(),
    ...timestamps,
  },
  (table) => [unique("orders_client_idempotency_unique").on(table.clientSessionId, table.idempotencyKey)],
);

export const orderVersions = pgTable(
  "order_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    items: jsonb("items").notNull(),
    totalCents: integer("total_cents").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => userProfiles.id, { onDelete: "restrict" }),
    confirmationMethod: text("confirmation_method"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("order_versions_order_version_unique").on(table.orderId, table.version)],
);

export const orderChangeRequests = pgTable("order_change_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "restrict" }),
  requestedByUserId: uuid("requested_by_user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "restrict" }),
  targetVersion: integer("target_version").notNull(),
  proposedItems: jsonb("proposed_items").notNull(),
  proposedTotalCents: integer("proposed_total_cents").notNull(),
  status: text("status").default("pending").notNull(),
  confirmationMethod: text("confirmation_method"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
});

export const administrativeRequests = pgTable("administrative_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull(),
  status: text("status").default("pending").notNull(),
  requestedByUserId: uuid("requested_by_user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "restrict" }),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => userProfiles.id, { onDelete: "restrict" }),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id, { onDelete: "restrict" }),
  targetUserId: uuid("target_user_id").references(() => userProfiles.id, { onDelete: "restrict" }),
  payload: jsonb("payload"),
  reason: text("reason"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => userProfiles.id, { onDelete: "restrict" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id, { onDelete: "restrict" }),
  before: jsonb("before"),
  after: jsonb("after"),
  reason: text("reason"),
  confirmationMethod: text("confirmation_method"),
  requestId: text("request_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const supportElevations = pgTable("support_elevations", {
  id: uuid("id").defaultRandom().primaryKey(),
  superadminUserId: uuid("superadmin_user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "restrict" }),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "restrict" }),
  scope: jsonb("scope").notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("active").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Restaurant = typeof restaurants.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type RestaurantMembership = typeof restaurantMemberships.$inferSelect;
export type PlatformRole = typeof platformRoles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Dish = typeof dishes.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type Extra = typeof extras.$inferSelect;
export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type TableSession = typeof tableSessions.$inferSelect;
export type ClientSession = typeof clientSessions.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderVersion = typeof orderVersions.$inferSelect;
export type OrderChangeRequest = typeof orderChangeRequests.$inferSelect;
export type AdministrativeRequest = typeof administrativeRequests.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type SupportElevation = typeof supportElevations.$inferSelect;
