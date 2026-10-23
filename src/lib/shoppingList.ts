import { typicalPackageSize } from "./ingredients";
import { parsePackageSize, toIngredientAmount } from "./matching";
import { amountCost } from "./pricing";
import {
  CHAIN_LABELS,
  type PackagePurchase,
  type PlanSettings,
  type PricedRecipe,
  type ShoppingGroup,
  type ShoppingItem,
} from "./types";

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
    item.packages = packagesFor(item);
    const store = item.price.store;
    const groupId = store?.id ?? ESTIMATE_GROUP;
    let group = groups.get(groupId);
    if (!group) {
      group = {
        storeId: groupId,
        title: store ? `${CHAIN_LABELS[store.chain]} – ${store.name}` : "Any store (no current offer)",
        items: [],
        total: 0,
        packageTotal: 0,
      };
      groups.set(groupId, group);
    }
    group.items.push(item);
    group.total += item.cost;
    group.packageTotal += item.packages?.cost ?? item.cost;
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

/**
 * Whole packages needed for an item: the offer's package when its size is
 * known, otherwise a typical package at the best known price. Returns
 * undefined for offers sold by weight, where you pay for what you take.
 */
export function packagesFor(item: ShoppingItem): PackagePurchase | undefined {
  const { ingredient, amount, price } = item;
  const offer = price.offer;
  if (offer) {
    const size = offer.packageSize ? parsePackageSize(offer.packageSize) : undefined;
    const sizeInUnit = size ? toIngredientAmount(ingredient, size) : undefined;
    if (sizeInUnit && sizeInUnit > 0) {
      const count = Math.max(1, Math.ceil(amount / sizeInUnit - 1e-9));
      return { count, size: sizeInUnit, cost: count * offer.price };
    }
    if (/\/\s*(kg|l)\b/i.test(offer.priceLabel)) return undefined;
  }
  const size = typicalPackageSize(ingredient);
  const count = Math.max(1, Math.ceil(amount / size - 1e-9));
  return { count, size, cost: amountCost(ingredient, count * size, price.unitPrice) };
}

/** "2 × 500 g", or "1 kg" for a single package. */
export function formatPackages(packages: PackagePurchase, unit: "g" | "ml" | "st"): string {
  const size = formatAmount(packages.size, unit);
  return packages.count > 1 ? `${packages.count} × ${size}` : size;
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
        `${group.title} (≈ ${formatSek(group.total)}, whole packages ${formatSek(group.packageTotal)})`,
        ...group.items.map((item) => {
          const packages = item.packages ? ` (${formatPackages(item.packages, item.ingredient.unit)})` : "";
          return `- ${item.ingredient.name}: ${formatAmount(item.amount, item.ingredient.unit)}${packages}`;
        }),
      ].join("\n"),
    )
    .join("\n\n");
}
