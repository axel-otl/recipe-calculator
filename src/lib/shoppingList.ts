import { CHAIN_LABELS, type PlanSettings, type PricedRecipe, type ShoppingGroup, type ShoppingItem } from "./types";
import { amountCost } from "./pricing";

export const ESTIMATE_GROUP = "estimate";

/** Combines the ingredients of all planned meals, grouped by the store with the best price. */
export function buildShoppingList(meals: PricedRecipe[], settings: PlanSettings): ShoppingGroup[] {
  const items = new Map<string, ShoppingItem>();
  for (const meal of meals) {
    for (const line of meal.lines) {
      if (line.ingredient.pantry && settings.havePantry) continue;
      const existing = items.get(line.ingredient.key);
      if (existing) {
        existing.amount += line.amount;
        if (!existing.recipes.includes(meal.recipe.name)) existing.recipes.push(meal.recipe.name);
      } else {
        items.set(line.ingredient.key, {
          ingredient: line.ingredient,
          amount: line.amount,
          cost: 0,
          price: line.price,
          recipes: [meal.recipe.name],
        });
      }
    }
  }

  const groups = new Map<string, ShoppingGroup>();
  for (const item of items.values()) {
    // You can't buy 2.4 eggs.
    if (item.ingredient.unit === "st") item.amount = Math.ceil(item.amount - 1e-9);
    item.cost = amountCost(item.ingredient, item.amount, item.price.unitPrice);
    const store = item.price.store;
    const groupId = store?.id ?? ESTIMATE_GROUP;
    let group = groups.get(groupId);
    if (!group) {
      group = {
        storeId: groupId,
        title: store ? `${CHAIN_LABELS[store.chain]} – ${store.name}` : "Any store (no current offer)",
        items: [],
        total: 0,
      };
      groups.set(groupId, group);
    }
    group.items.push(item);
    group.total += item.cost;
  }

  for (const group of groups.values()) {
    group.items.sort((a, b) => a.ingredient.category.localeCompare(b.ingredient.category));
  }
  // Stores with offers first, the catch-all group last.
  return [...groups.values()].sort((a, b) => {
    if (a.storeId === ESTIMATE_GROUP) return 1;
    if (b.storeId === ESTIMATE_GROUP) return -1;
    return b.total - a.total;
  });
}

/** Rounds to sensible shopping amounts: 1.2 kg, 350 g, 4 dl, 6 st. */
export function formatAmount(amount: number, unit: "g" | "ml" | "st"): string {
  if (unit === "st") return `${Math.ceil(amount - 1e-9)} st`;
  if (unit === "g") {
    if (amount >= 1000) return `${(Math.round(amount / 100) / 10).toLocaleString("sv-SE")} kg`;
    return `${Math.max(5, Math.round(amount / 5) * 5)} g`;
  }
  if (amount >= 1000) return `${(Math.round(amount / 100) / 10).toLocaleString("sv-SE")} l`;
  if (amount >= 100) return `${(Math.round(amount / 50) / 2).toLocaleString("sv-SE")} dl`;
  return `${Math.max(5, Math.round(amount / 5) * 5)} ml`;
}

export function formatSek(amount: number): string {
  return `${amount.toLocaleString("sv-SE", { maximumFractionDigits: amount < 100 ? 1 : 0 })} kr`;
}

export function shoppingListText(groups: ShoppingGroup[]): string {
  return groups
    .map((group) =>
      [
        `${group.title} (≈ ${formatSek(group.total)})`,
        ...group.items.map(
          (item) => `- ${item.ingredient.name}: ${formatAmount(item.amount, item.ingredient.unit)}`,
        ),
      ].join("\n"),
    )
    .join("\n\n");
}
