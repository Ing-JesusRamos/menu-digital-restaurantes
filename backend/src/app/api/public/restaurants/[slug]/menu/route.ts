import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/client";
import {
  categories,
  dishExtras,
  dishIngredients,
  dishes,
  extras,
  ingredients,
  restaurants,
} from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const db = getDatabase();

  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const restaurantCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.restaurantId, restaurant.id))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  const restaurantDishes = await db
    .select()
    .from(dishes)
    .where(and(eq(dishes.restaurantId, restaurant.id), eq(dishes.available, true)))
    .orderBy(asc(dishes.sortOrder), asc(dishes.name));

  const restaurantIngredients = await db
    .select({
      dishId: dishIngredients.dishId,
      ingredientId: ingredients.id,
      name: ingredients.name,
      available: ingredients.available,
      includedByDefault: dishIngredients.includedByDefault,
      removable: dishIngredients.removable,
    })
    .from(dishIngredients)
    .innerJoin(ingredients, eq(dishIngredients.ingredientId, ingredients.id))
    .where(eq(dishIngredients.restaurantId, restaurant.id));

  const restaurantExtras = await db
    .select({
      dishId: dishExtras.dishId,
      extraId: extras.id,
      name: extras.name,
      priceCents: extras.priceCents,
      available: extras.available,
      maxQuantity: dishExtras.maxQuantity,
      sortOrder: dishExtras.sortOrder,
    })
    .from(dishExtras)
    .innerJoin(extras, eq(dishExtras.extraId, extras.id))
    .where(eq(dishExtras.restaurantId, restaurant.id))
    .orderBy(asc(dishExtras.sortOrder), asc(extras.name));

  const menu = restaurantCategories
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      dishes: restaurantDishes
        .filter((dish) => dish.categoryId === category.id)
        .map((dish) => ({
          id: dish.id,
          name: dish.name,
          slug: dish.slug,
          description: dish.description,
          priceCents: dish.priceCents,
          imageUrl: dish.imageUrl,
          ingredients: restaurantIngredients
            .filter((ingredient) => ingredient.dishId === dish.id)
            .map(({ dishId: _dishId, ...ingredient }) => ingredient),
          extras: restaurantExtras
            .filter((extra) => extra.dishId === dish.id)
            .map(({ dishId: _dishId, ...extra }) => extra),
        })),
    }))
    .filter((category) => category.dishes.length > 0);

  return NextResponse.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
    },
    categories: menu,
  });
}
