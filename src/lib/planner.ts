import { getIngredient } from "./ingredients";
import { amountCost, amountKcal, priceFor, type PriceTable } from "./pricing";
import type { MealPlan, PlanSettings, PricedIngredientLine, PricedRecipe, Recipe } from "./types";

const MIN_PORTION_SCALE = 0.6;
const MAX_PORTION_SCALE = 1.6;

export function isVegetarian(recipe: Recipe): boolean {
  return recipe.ingredients.every((i) => getIngredient(i.key).vegetarian);
}

export function baseKcalPerServing(recipe: Recipe): number {
  const total = recipe.ingredients.reduce((sum, i) => sum + amountKcal(getIngredient(i.key), i.amount), 0);
  return total / recipe.servings;
}

/**
 * Prices a recipe for the plan: scales it to the requested number of
 * portions and adjusts portion size towards the calorie goal.
 */
export function priceRecipe(recipe: Recipe, settings: PlanSettings, table: PriceTable): PricedRecipe {
  const baseKcal = baseKcalPerServing(recipe);
  const rawScale = baseKcal > 0 ? settings.kcalPerServing / baseKcal : 1;
  const portionScale =
    Math.round(Math.min(MAX_PORTION_SCALE, Math.max(MIN_PORTION_SCALE, rawScale)) * 20) / 20;
  const factor = (settings.servings / recipe.servings) * portionScale;

  let totalCost = 0;
  let savings = 0;
  let offerCount = 0;
  const lines: PricedIngredientLine[] = recipe.ingredients.map(({ key, amount }) => {
    const ingredient = getIngredient(key);
    const scaled = amount * factor;
    const price = priceFor(key, table);
    const cost = amountCost(ingredient, scaled, price.unitPrice);
    if (!(ingredient.pantry && settings.havePantry)) {
      totalCost += cost;
      if (price.source === "offer") {
        offerCount++;
        savings += amountCost(ingredient, scaled, ingredient.basePrice) - cost;
      }
    }
    return { ingredient, amount: scaled, cost, price };
  });

  return {
    recipe,
    portionScale,
    kcalPerServing: baseKcal * portionScale,
    costPerServing: settings.servings > 0 ? totalCost / settings.servings : 0,
    totalCost,
    savings,
    offerCount,
    lines,
  };
}

/** Lower is better: cheap per portion, with a bonus for using this week's offers. */
function score(priced: PricedRecipe, settings: PlanSettings): number {
  return priced.costPerServing - (0.5 * priced.savings) / Math.max(1, settings.servings);
}

/**
 * Picks `settings.meals` recipes that fit the budget, preferring cheap meals
 * built on current offers and avoiding the same main ingredient twice.
 */
export function planMeals(
  recipes: Recipe[],
  settings: PlanSettings,
  table: PriceTable,
  excludedIds: string[] = [],
): MealPlan {
  const candidates = recipes
    .filter((r) => !excludedIds.includes(r.id))
    .filter((r) => !settings.vegetarian || isVegetarian(r))
    .map((r) => priceRecipe(r, settings, table))
    .sort((a, b) => score(a, settings) - score(b, settings));

  const picked: PricedRecipe[] = [];
  const usedMains = new Set<string>();
  let remaining = settings.budget;

  const cheapestSum = (pool: PricedRecipe[], count: number) =>
    pool
      .map((p) => p.totalCost)
      .sort((a, b) => a - b)
      .slice(0, count)
      .reduce((sum, c) => sum + c, 0);

  // Two passes: first with distinct main ingredients, then allowing repeats
  // if there weren't enough distinct recipes.
  for (const distinctMains of [true, false]) {
    while (picked.length < settings.meals) {
      const pool = candidates.filter(
        (c) => !picked.includes(c) && (!distinctMains || !usedMains.has(c.recipe.mainIngredient)),
      );
      if (pool.length === 0) break;
      const slotsLeft = settings.meals - picked.length - 1;
      // Take the best-scoring recipe that still leaves room for the cheapest
      // possible remaining meals; if nothing fits, take the cheapest one.
      const choice =
        pool.find(
          (c) => c.totalCost + cheapestSum(pool.filter((p) => p !== c), slotsLeft) <= remaining,
        ) ?? [...pool].sort((a, b) => a.totalCost - b.totalCost)[0];
      picked.push(choice);
      usedMains.add(choice.recipe.mainIngredient);
      remaining -= choice.totalCost;
    }
  }

  const totalCost = picked.reduce((sum, p) => sum + p.totalCost, 0);
  return {
    meals: picked,
    totalCost,
    totalSavings: picked.reduce((sum, p) => sum + p.savings, 0),
    withinBudget: totalCost <= settings.budget,
    alternatives: candidates
      .filter((c) => !picked.includes(c))
      .sort((a, b) => a.totalCost - b.totalCost),
  };
}
