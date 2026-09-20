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
  ...timestamps,
});

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
      .references(() => restaurants.id, { onDelete: "cascade" }),
    tableSessionId: uuid("table_session_id")
      .notNull()
      .references(() => tableSessions.id, { onDelete: "restrict" }),
    clientSessionId: uuid("client_session_id")
      .notNull()
      .references(() => clientSessions.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status").default("submitted").notNull(),
    items: jsonb("items").notNull(),
    totalCents: integer("total_cents").notNull(),
    ...timestamps,
  },
  (table) => [unique("orders_client_idempotency_unique").on(table.clientSessionId, table.idempotencyKey)],
);

export type Restaurant = typeof restaurants.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Dish = typeof dishes.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type Extra = typeof extras.$inferSelect;
export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type TableSession = typeof tableSessions.$inferSelect;
export type ClientSession = typeof clientSessions.$inferSelect;
export type Order = typeof orders.$inferSelect;
