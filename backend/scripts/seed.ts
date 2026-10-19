import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { hashTableCode } from "../src/lib/security/tokens";
import { eq } from "drizzle-orm";
import {
  categories,
  dishExtras,
  dishIngredients,
  dishes,
  extras,
  ingredients,
  restaurants,
  restaurantMemberships,
  restaurantTables,
  userProfiles,
} from "../src/lib/db/schema";

config({ path: ".env.local" });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const developmentAdminId = "00000000-0000-4000-8000-000000000001";

async function seed() {
  let [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, "demo-restaurante"))
    .limit(1);

  if (!restaurant) {
    [restaurant] = await db
      .insert(restaurants)
      .values({ name: "Restaurante Demo", slug: "demo-restaurante" })
      .returning();
  }

  let [developmentAdmin] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, developmentAdminId))
    .limit(1);

  if (!developmentAdmin) {
    [developmentAdmin] = await db
      .insert(userProfiles)
      .values({
        id: developmentAdminId,
        displayName: "Administrador Demo",
        status: "active",
      })
      .returning();
  }

  await db
    .insert(restaurantMemberships)
    .values({
      userId: developmentAdmin.id,
      restaurantId: restaurant.id,
      role: "restaurant_admin",
      status: "active",
    })
    .onConflictDoNothing();

  let [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, "hamburguesas"))
    .limit(1);

  if (!category) {
    [category] = await db
      .insert(categories)
      .values({
        restaurantId: restaurant.id,
        name: "Hamburguesas",
        slug: "hamburguesas",
      })
      .returning();
  }

  let [dish] = await db
    .select()
    .from(dishes)
    .where(eq(dishes.slug, "hamburguesa-clasica"))
    .limit(1);

  if (!dish) {
    [dish] = await db
      .insert(dishes)
      .values({
        restaurantId: restaurant.id,
        categoryId: category.id,
        name: "Hamburguesa clásica",
        slug: "hamburguesa-clasica",
        description: "Carne, queso, lechuga y tomate.",
        priceCents: 24000,
      })
      .returning();
  }

  const ingredientValues = [
    { name: "Carne", includedByDefault: true, removable: false },
    { name: "Queso", includedByDefault: true, removable: true },
    { name: "Lechuga", includedByDefault: true, removable: true },
    { name: "Tomate", includedByDefault: true, removable: true },
  ];

  for (const value of ingredientValues) {
    let [ingredient] = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.name, value.name))
      .limit(1);

    if (!ingredient) {
      [ingredient] = await db
        .insert(ingredients)
        .values({ restaurantId: restaurant.id, name: value.name })
        .returning();
    }

    await db
      .insert(dishIngredients)
      .values({
        restaurantId: restaurant.id,
        dishId: dish.id,
        ingredientId: ingredient.id,
        includedByDefault: value.includedByDefault,
        removable: value.removable,
      })
      .onConflictDoNothing();
  }

  let [extra] = await db
    .select()
    .from(extras)
    .where(eq(extras.name, "Porción de papas"))
    .limit(1);

  if (!extra) {
    [extra] = await db
      .insert(extras)
      .values({
        restaurantId: restaurant.id,
        name: "Porción de papas",
        priceCents: 5000,
      })
      .returning();
  }

  await db
    .insert(dishExtras)
    .values({
      restaurantId: restaurant.id,
      dishId: dish.id,
      extraId: extra.id,
      maxQuantity: 3,
    })
    .onConflictDoNothing();

  const [table] = await db
    .select()
    .from(restaurantTables)
    .where(eq(restaurantTables.label, "1"))
    .limit(1);

  if (!table) {
    await db.insert(restaurantTables).values({
      restaurantId: restaurant.id,
      label: "1",
      codeHash: hashTableCode("1001"),
    });
  }

  console.log(`Seed complete: ${restaurant.slug} (table code: 1001)`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
