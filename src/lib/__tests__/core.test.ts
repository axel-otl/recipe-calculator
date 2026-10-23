import { describe, expect, it } from "vitest";
import { getIngredient, INGREDIENTS } from "../ingredients";
import { matchIngredient, parsePackageSize } from "../matching";
import { baseKcalPerServing, planMeals, priceRecipe } from "../planner";
import { buildPriceTable, offerUnitPrice } from "../pricing";
import { sampleOffers, sampleStores } from "../providers/sample";
import { RECIPES } from "../recipes";
import { buildShoppingList, formatAmount } from "../shoppingList";
import type { Offer, PlanSettings, Store } from "../types";

const SETTINGS: PlanSettings = {
  budget: 600,
  kcalPerServing: 650,
  servings: 4,
  meals: 5,
  vegetarian: false,
  havePantry: true,
};

const store: Store = {
  id: "live:willys:1",
  chain: "willys",
  chainStoreId: "1",
  name: "Test",
  lat: 59.85,
  lng: 17.63,
  source: "live",
};

const offer = (name: string, extra: Partial<Offer> = {}): Offer => ({
  id: name,
  storeId: store.id,
  chain: "willys",
  name,
  price: 50,
  priceLabel: "50 kr",
  ...extra,
});

describe("matchIngredient", () => {
  it.each([
    ["Kycklingfilé Fryst 1kg", "kycklingfile"],
    ["Kycklinglårfilé 700g", "kycklinglarfile"],
    ["Nötfärs 12% 500g", "notfars"],
    ["Krossade Tomater 400g", "krossade_tomater"],
    ["Ägg 12-p Frigående", "agg"],
    ["Basmatiris 1kg", "ris"],
    ["Potatis Fast 2kg", "potatis"],
    ["Sötpotatis", "sotpotatis"],
  ])("%s → %s", (name, key) => {
    expect(matchIngredient(name)?.key).toBe(key);
  });

  it.each(["Kycklingfilé Pålägg Skivad", "Äggnudlar 250g", "Potatischips Salt", "Vegofärs"])(
    "doesn't match %s to the wrong thing",
    (name) => {
      const key = matchIngredient(name)?.key;
      expect(key === undefined || !["kycklingfile", "agg", "potatis", "notfars"].includes(key)).toBe(true);
    },
  );
});

describe("parsePackageSize", () => {
  it.each([
    ["900 g", { amount: 0.9, unit: "kg" }],
    ["1,5 kg", { amount: 1.5, unit: "kg" }],
    ["2,5 dl", { amount: 0.25, unit: "l" }],
    ["4x125 g", { amount: 0.5, unit: "kg" }],
    ["12-p", { amount: 12, unit: "st" }],
  ])("%s", (text, expected) => {
    const result = parsePackageSize(text)!;
    expect(result.unit).toBe(expected.unit);
    expect(result.amount).toBeCloseTo(expected.amount);
  });
});

describe("pricing", () => {
  it("uses the comparison price when present", () => {
    const price = offerUnitPrice(getIngredient("kycklingfile"), offer("Kycklingfilé", { unitPrice: 89, unit: "kg" }));
    expect(price).toBe(89);
  });

  it("derives the unit price from the package size", () => {
    const price = offerUnitPrice(getIngredient("notfars"), offer("Nötfärs", { price: 45, packageSize: "500 g" }));
    expect(price).toBe(90);
  });

  it("converts per-kg prices for piece ingredients", () => {
    const price = offerUnitPrice(getIngredient("avokado"), offer("Avokado", { unitPrice: 40, unit: "kg" }));
    expect(price).toBeCloseTo(6.8);
  });

  it("ignores implausible prices from mismatches", () => {
    expect(offerUnitPrice(getIngredient("laxfile"), offer("Laxfilé", { unitPrice: 9, unit: "kg" }))).toBeUndefined();
  });

  it("keeps the cheapest offer per ingredient and skips non-discounts", () => {
    const table = buildPriceTable(
      [
        offer("Nötfärs 500g", { price: 50, packageSize: "500 g" }),
        offer("Nötfärs 1kg", { price: 85, packageSize: "1 kg" }),
        offer("Laxfilé 400g", { price: 120, packageSize: "400 g" }),
      ],
      [store],
    );
    expect(table.get("notfars")?.unitPrice).toBe(85);
    // 300 kr/kg is above the regular price, so it's not a deal.
    expect(table.has("laxfile")).toBe(false);
  });
});

describe("recipes", () => {
  it("only reference catalog ingredients", () => {
    for (const recipe of RECIPES) {
      for (const ingredient of recipe.ingredients) expect(() => getIngredient(ingredient.key)).not.toThrow();
      expect(() => getIngredient(recipe.mainIngredient)).not.toThrow();
    }
  });

  it("have plausible calories per serving", () => {
    for (const recipe of RECIPES) {
      const kcal = baseKcalPerServing(recipe);
      expect(kcal, recipe.id).toBeGreaterThan(350);
      expect(kcal, recipe.id).toBeLessThan(1100);
    }
  });
});

describe("planner", () => {
  const stores = sampleStores().filter((s) => s.city === "Uppsala");
  const table = buildPriceTable(stores.flatMap((s) => sampleOffers(s, new Date("2026-10-20"))), stores);

  it("scales portions towards the calorie goal", () => {
    const priced = priceRecipe(RECIPES[0], { ...SETTINGS, kcalPerServing: 900 }, table);
    expect(priced.portionScale).toBeGreaterThan(1);
    expect(Math.abs(priced.kcalPerServing - 900)).toBeLessThan(60);
  });

  it("plans the requested number of varied meals within budget", () => {
    const plan = planMeals(RECIPES, SETTINGS, table);
    expect(plan.meals).toHaveLength(5);
    expect(new Set(plan.meals.map((m) => m.recipe.mainIngredient)).size).toBe(5);
    expect(plan.withinBudget).toBe(true);
    expect(plan.totalCost).toBeLessThanOrEqual(SETTINGS.budget);
  });

  it("respects the vegetarian setting", () => {
    const plan = planMeals(RECIPES, { ...SETTINGS, vegetarian: true }, table);
    for (const meal of plan.meals) {
      expect(meal.lines.every((l) => l.ingredient.vegetarian)).toBe(true);
    }
  });

  it("flags plans that can't fit the budget", () => {
    const plan = planMeals(RECIPES, { ...SETTINGS, budget: 50 }, table);
    expect(plan.meals).toHaveLength(5);
    expect(plan.withinBudget).toBe(false);
  });

  it("builds a shopping list that adds up to the plan cost", () => {
    const plan = planMeals(RECIPES, SETTINGS, table);
    const groups = buildShoppingList(plan.meals, SETTINGS);
    const total = groups.reduce((sum, g) => sum + g.total, 0);
    // Whole eggs etc. round up, so the list may cost slightly more.
    expect(total).toBeGreaterThanOrEqual(plan.totalCost - 0.01);
    expect(total).toBeLessThan(plan.totalCost * 1.1);
    expect(groups.flatMap((g) => g.items).some((i) => i.ingredient.pantry)).toBe(false);
  });
});

describe("sample data", () => {
  it("is stable within a week and covers every chain", () => {
    const stores = sampleStores();
    expect(new Set(stores.map((s) => s.chain)).size).toBe(5);
    const a = sampleOffers(stores[0], new Date("2026-10-20"));
    const b = sampleOffers(stores[0], new Date("2026-10-22"));
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(5);
    expect(a.every((o) => INGREDIENTS.some((i) => i.key === o.ingredientKey))).toBe(true);
  });
});

describe("formatAmount", () => {
  it.each([
    [1240, "g", "1,2 kg"],
    [347, "g", "345 g"],
    [400, "ml", "4 dl"],
    [2.2, "st", "3 st"],
  ] as const)("%s %s → %s", (amount, unit, expected) => {
    expect(formatAmount(amount, unit)).toBe(expected);
  });
});
