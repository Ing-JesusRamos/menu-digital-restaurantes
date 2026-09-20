import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db/client";
import {
  clientSessions,
  dishExtras,
  dishIngredients,
  dishes,
  extras,
  ingredients,
  orders,
  tableSessions,
} from "@/lib/db/schema";
import { hashRequest, hashToken } from "@/lib/security/tokens";

const itemSchema = z.object({
  dishId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  removedIngredientIds: z.array(z.string().uuid()).max(50).default([]),
  extras: z
    .array(
      z.object({
        extraId: z.string().uuid(),
        quantity: z.number().int().min(0).max(99),
      }),
    )
    .max(20)
    .default([]),
});

const bodySchema = z.object({
  tableSessionId: z.string().uuid(),
  items: z.array(itemSchema).min(1).max(50),
});

type SnapshotItem = {
  dishId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  removedIngredients: { id: string; name: string }[];
  extras: { id: string; name: string; quantity: number; unitPriceCents: number }[];
  subtotalCents: number;
};

export async function POST(request: Request) {
  const clientToken = request.headers.get("x-client-session-token");
  const idempotencyKey = request.headers.get("idempotency-key");
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > 1_048_576) {
    return NextResponse.json({ error: "Order payload is too large" }, { status: 413 });
  }

  if (!clientToken || !idempotencyKey) {
    return NextResponse.json(
      { error: "x-client-session-token and idempotency-key are required" },
      { status: 400 },
    );
  }

  if (idempotencyKey.length > 128) {
    return NextResponse.json({ error: "Idempotency-Key is too long" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const requestHash = hashRequest(parsed.data);
  const db = getDatabase();
  const [session] = await db
    .select({
      clientSession: clientSessions,
      tableSession: tableSessions,
    })
    .from(clientSessions)
    .innerJoin(tableSessions, eq(clientSessions.tableSessionId, tableSessions.id))
    .where(and(eq(clientSessions.tokenHash, hashToken(clientToken)), isNull(clientSessions.invalidatedAt)))
    .limit(1);

  if (!session || session.tableSession.id !== parsed.data.tableSessionId) {
    return NextResponse.json({ error: "Invalid client session" }, { status: 401 });
  }

  if (session.tableSession.status !== "open") {
    return NextResponse.json({ error: "Table session is closed" }, { status: 409 });
  }

  const existing = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.clientSessionId, session.clientSession.id),
        eq(orders.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);

  if (existing[0]) {
    if (existing[0].requestHash !== requestHash) {
      return NextResponse.json({ error: "Idempotency key was reused with a different request" }, { status: 409 });
    }

    return NextResponse.json({ order: existing[0], replayed: true });
  }

  const dishIds = parsed.data.items.map((item) => item.dishId);
  const requestedExtraIds = parsed.data.items.flatMap((item) =>
    item.extras.filter((extra) => extra.quantity > 0).map((extra) => extra.extraId),
  );
  const requestedIngredientIds = parsed.data.items.flatMap((item) => item.removedIngredientIds);

  const [selectedDishes, selectedIngredients, selectedExtras] = await Promise.all([
    db
      .select()
      .from(dishes)
      .where(and(eq(dishes.restaurantId, session.clientSession.restaurantId), inArray(dishes.id, dishIds))),
    requestedIngredientIds.length
      ? db
          .select({
            relation: dishIngredients,
            ingredient: ingredients,
          })
          .from(dishIngredients)
          .innerJoin(ingredients, eq(dishIngredients.ingredientId, ingredients.id))
          .where(
            and(
              eq(dishIngredients.restaurantId, session.clientSession.restaurantId),
              inArray(dishIngredients.ingredientId, requestedIngredientIds),
            ),
          )
      : Promise.resolve([]),
    requestedExtraIds.length
      ? db
          .select({ relation: dishExtras, extra: extras })
          .from(dishExtras)
          .innerJoin(extras, eq(dishExtras.extraId, extras.id))
          .where(
            and(
              eq(dishExtras.restaurantId, session.clientSession.restaurantId),
              inArray(dishExtras.extraId, requestedExtraIds),
            ),
          )
      : Promise.resolve([]),
  ]);

  const allDishIngredients = await db
    .select({ relation: dishIngredients, ingredient: ingredients })
    .from(dishIngredients)
    .innerJoin(ingredients, eq(dishIngredients.ingredientId, ingredients.id))
    .where(
      and(
        eq(dishIngredients.restaurantId, session.clientSession.restaurantId),
        inArray(dishIngredients.dishId, dishIds),
      ),
    );

  const snapshot: SnapshotItem[] = [];

  for (const item of parsed.data.items) {
    const dish = selectedDishes.find((candidate) => candidate.id === item.dishId);
    if (!dish || !dish.available) {
      return NextResponse.json({ error: `Dish ${item.dishId} is not available` }, { status: 409 });
    }

    const dishIngredientsForItem = allDishIngredients.filter(({ relation }) => relation.dishId === dish.id);
    const removedIds = new Set(item.removedIngredientIds);

    for (const { relation, ingredient } of dishIngredientsForItem) {
      if (removedIds.has(ingredient.id) && !relation.removable) {
        return NextResponse.json({ error: `Ingredient ${ingredient.name} cannot be removed` }, { status: 409 });
      }
      if (relation.includedByDefault && ingredient.available === false && !removedIds.has(ingredient.id)) {
        return NextResponse.json({ error: `Ingredient ${ingredient.name} is no longer available` }, { status: 409 });
      }
    }

    const removedIngredients = item.removedIngredientIds.map((ingredientId) => {
      const match = dishIngredientsForItem.find(({ ingredient }) => ingredient.id === ingredientId);
      return match ? { id: match.ingredient.id, name: match.ingredient.name } : null;
    });

    if (removedIngredients.some((ingredient) => ingredient === null)) {
      return NextResponse.json({ error: "An ingredient does not belong to the selected dish" }, { status: 400 });
    }

    const selectedItemExtras = [];
    let extrasTotalCents = 0;

    for (const selectedExtra of item.extras.filter((extra) => extra.quantity > 0)) {
      const relation = selectedExtras.find(
        ({ relation: candidateRelation }) =>
          candidateRelation.dishId === dish.id && candidateRelation.extraId === selectedExtra.extraId,
      );

      if (!relation || !relation.extra.available || selectedExtra.quantity > relation.relation.maxQuantity) {
        return NextResponse.json({ error: `Extra ${selectedExtra.extraId} is not available for this dish` }, { status: 409 });
      }

      const subtotal = relation.extra.priceCents * selectedExtra.quantity * item.quantity;
      extrasTotalCents += subtotal;
      selectedItemExtras.push({
        id: relation.extra.id,
        name: relation.extra.name,
        quantity: selectedExtra.quantity,
        unitPriceCents: relation.extra.priceCents,
      });
    }

    const subtotalCents = dish.priceCents * item.quantity + extrasTotalCents;
    snapshot.push({
      dishId: dish.id,
      name: dish.name,
      quantity: item.quantity,
      unitPriceCents: dish.priceCents,
      removedIngredients: removedIngredients as { id: string; name: string }[],
      extras: selectedItemExtras,
      subtotalCents,
    });
  }

  const totalCents = snapshot.reduce((total, item) => total + item.subtotalCents, 0);

  try {
    const result = await db.transaction(async (tx) => {
      // Serialize order creation with table closure for this table session.
      await tx.execute(sql`SELECT id FROM table_sessions WHERE id = ${session.tableSession.id} FOR UPDATE`);

      const [lockedSession] = await tx
        .select()
        .from(tableSessions)
        .where(eq(tableSessions.id, session.tableSession.id))
        .limit(1);

      if (!lockedSession || lockedSession.status !== "open") {
        return { kind: "closed" as const };
      }

      const [existingInTransaction] = await tx
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.clientSessionId, session.clientSession.id),
            eq(orders.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);

      if (existingInTransaction) {
        if (existingInTransaction.requestHash !== requestHash) {
          return { kind: "conflict" as const };
        }
        return { kind: "replayed" as const, order: existingInTransaction };
      }

      const [order] = await tx
        .insert(orders)
        .values({
          restaurantId: session.clientSession.restaurantId,
          tableSessionId: session.tableSession.id,
          clientSessionId: session.clientSession.id,
          idempotencyKey,
          requestHash,
          status: "submitted",
          items: snapshot,
          totalCents,
        })
        .returning();

      return { kind: "created" as const, order };
    });

    if (result.kind === "closed") {
      return NextResponse.json({ error: "Table session is closed" }, { status: 409 });
    }
    if (result.kind === "conflict") {
      return NextResponse.json({ error: "Idempotency key was reused with a different request" }, { status: 409 });
    }
    if (result.kind === "replayed") {
      return NextResponse.json({ order: result.order, replayed: true });
    }

    return NextResponse.json({ order: result.order, replayed: false }, { status: 201 });
  } catch (error) {
    const [raceWinner] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.clientSessionId, session.clientSession.id),
          eq(orders.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);

    if (raceWinner && raceWinner.requestHash === requestHash) {
      return NextResponse.json({ order: raceWinner, replayed: true });
    }

    throw error;
  }
}
