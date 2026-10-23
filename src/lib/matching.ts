import { INGREDIENTS } from "./ingredients";
import type { Ingredient, IngredientUnit, PriceUnit } from "./types";

/**
 * Finds the catalog ingredient a store product name refers to. The longest
 * matching keyword wins, so "kycklinglårfilé" beats "kyckling".
 */
export function matchIngredient(productName: string): Ingredient | undefined {
  // Pad with spaces so keywords like "ris " only match whole words at the end too.
  const name = ` ${productName.toLowerCase()} `;
  let best: Ingredient | undefined;
  let bestLength = 0;
  for (const ingredient of INGREDIENTS) {
    if (ingredient.exclude?.some((word) => name.includes(word))) continue;
    for (const keyword of ingredient.keywords) {
      if (keyword.length > bestLength && name.includes(keyword)) {
        best = ingredient;
        bestLength = keyword.length;
      }
    }
  }
  return best;
}

export interface Quantity {
  amount: number;
  unit: PriceUnit;
}

/** Parses package sizes like "900 g", "1,5 kg", "2,5 dl", "500ml", "12 st", "12-p". */
export function parsePackageSize(text: string): Quantity | undefined {
  const match = text
    .toLowerCase()
    .replace(",", ".")
    .match(/(\d+(?:\.\d+)?)\s*(?:x\s*(\d+(?:\.\d+)?)\s*)?(kg|g|hg|l|dl|cl|ml|st|-?p\b|pack)/);
  if (!match) return undefined;
  let amount = parseFloat(match[1]);
  // "4x125 g" → 500 g
  if (match[2]) amount *= parseFloat(match[2]);
  switch (match[3]) {
    case "kg":
      return { amount, unit: "kg" };
    case "hg":
      return { amount: amount / 10, unit: "kg" };
    case "g":
      return { amount: amount / 1000, unit: "kg" };
    case "l":
      return { amount, unit: "l" };
    case "dl":
      return { amount: amount / 10, unit: "l" };
    case "cl":
      return { amount: amount / 100, unit: "l" };
    case "ml":
      return { amount: amount / 1000, unit: "l" };
    default:
      return { amount, unit: "st" };
  }
}

/** Converts a package quantity into the ingredient's unit (g, ml or pieces). */
export function toIngredientAmount(ingredient: Ingredient, quantity: Quantity): number | undefined {
  const { amount, unit } = quantity;
  if (ingredient.unit === "st") {
    if (unit === "st") return amount;
    return ingredient.pieceGrams && unit === "kg" ? (amount * 1000) / ingredient.pieceGrams : undefined;
  }
  // Treat 1 l ≈ 1 kg, as for prices.
  if (unit === "kg" || unit === "l") return amount * 1000;
  return ingredient.pieceGrams ? amount * ingredient.pieceGrams : undefined;
}

/**
 * Converts a price per `unit` into SEK per the ingredient's pricing unit
 * (kg for "g", l for "ml", piece for "st"). Returns undefined when the
 * units can't be compared.
 */
export function toIngredientUnitPrice(
  ingredient: Ingredient,
  unitPrice: number,
  unit: PriceUnit,
): number | undefined {
  const target: Record<IngredientUnit, PriceUnit> = { g: "kg", ml: "l", st: "st" };
  const wanted = target[ingredient.unit];
  if (unit === wanted) return unitPrice;
  // Treat 1 l ≈ 1 kg for cream, yoghurt and the like.
  if ((wanted === "kg" && unit === "l") || (wanted === "l" && unit === "kg")) return unitPrice;
  if (!ingredient.pieceGrams) return undefined;
  if (wanted === "st" && unit === "kg") return (unitPrice * ingredient.pieceGrams) / 1000;
  if (wanted === "kg" && unit === "st") return (unitPrice * 1000) / ingredient.pieceGrams;
  return undefined;
}
