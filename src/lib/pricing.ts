import { getIngredient, hasIngredient } from "./ingredients";
import { matchIngredient, parsePackageSize, toIngredientUnitPrice } from "./matching";
import type { Ingredient, IngredientPrice, Offer, Store } from "./types";

export type PriceTable = Map<string, IngredientPrice>;

/**
 * An offer whose unit price is far from the usual price has most likely been
 * matched to the wrong ingredient (e.g. sliced chicken cold cuts), so it's ignored.
 */
const MIN_PRICE_RATIO = 0.2;
const MAX_PRICE_RATIO = 3;

/** SEK per the ingredient's pricing unit for this offer, if it can be worked out. */
export function offerUnitPrice(ingredient: Ingredient, offer: Offer): number | undefined {
  let price: number | undefined;
  if (offer.unitPrice && offer.unit) {
    price = toIngredientUnitPrice(ingredient, offer.unitPrice, offer.unit);
  }
  if (price === undefined && offer.packageSize) {
    const size = parsePackageSize(offer.packageSize);
    if (size && size.amount > 0) {
      price = toIngredientUnitPrice(ingredient, offer.price / size.amount, size.unit);
    }
  }
  if (price === undefined || !Number.isFinite(price) || price <= 0) return undefined;
  const ratio = price / ingredient.basePrice;
  if (ratio < MIN_PRICE_RATIO || ratio > MAX_PRICE_RATIO) return undefined;
  return price;
}

/** Tags each offer with the ingredient it matches, keeping any existing tag. */
export function tagOffers(offers: Offer[]): Offer[] {
  return offers.map((offer) => {
    if (offer.ingredientKey && hasIngredient(offer.ingredientKey)) return offer;
    const ingredient = matchIngredient(offer.name);
    return ingredient ? { ...offer, ingredientKey: ingredient.key } : offer;
  });
}

/** Cheapest offer per ingredient across the given stores. */
export function buildPriceTable(offers: Offer[], stores: Store[]): PriceTable {
  const storesById = new Map(stores.map((s) => [s.id, s]));
  const table: PriceTable = new Map();
  for (const offer of tagOffers(offers)) {
    if (!offer.ingredientKey) continue;
    const store = storesById.get(offer.storeId);
    if (!store) continue;
    const ingredient = getIngredient(offer.ingredientKey);
    const unitPrice = offerUnitPrice(ingredient, offer);
    if (unitPrice === undefined || unitPrice >= ingredient.basePrice) continue;
    const current = table.get(ingredient.key);
    if (!current || unitPrice < current.unitPrice) {
      table.set(ingredient.key, { key: ingredient.key, unitPrice, source: "offer", offer, store });
    }
  }
  return table;
}

export function priceFor(key: string, table: PriceTable): IngredientPrice {
  return table.get(key) ?? { key, unitPrice: getIngredient(key).basePrice, source: "estimate" };
}

/** Cost in SEK of `amount` (in the ingredient's unit) at `unitPrice`. */
export function amountCost(ingredient: Ingredient, amount: number, unitPrice: number): number {
  return ingredient.unit === "st" ? amount * unitPrice : (amount / 1000) * unitPrice;
}

export function amountKcal(ingredient: Ingredient, amount: number): number {
  return ingredient.unit === "st" ? amount * ingredient.kcal : (amount / 100) * ingredient.kcal;
}
