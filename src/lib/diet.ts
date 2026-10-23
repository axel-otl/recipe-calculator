import { getIngredient, ingredientTags } from "./ingredients";
import type { Diet, DietSettings, FoodTag, Ingredient, Recipe } from "./types";

const MEAT: FoodTag[] = ["beef", "pork", "poultry"];

export const DIETS: { id: Diet; label: string; excludes: FoodTag[] }[] = [
  { id: "none", label: "Everything", excludes: [] },
  { id: "pescetarian", label: "Pescetarian", excludes: MEAT },
  { id: "vegetarian", label: "Vegetarian", excludes: [...MEAT, "fish", "shellfish"] },
  { id: "vegan", label: "Vegan", excludes: [...MEAT, "fish", "shellfish", "dairy", "egg"] },
];

export const EXCLUSIONS: { id: FoodTag; label: string }[] = [
  { id: "gluten", label: "Gluten" },
  { id: "dairy", label: "Dairy / lactose" },
  { id: "egg", label: "Egg" },
  { id: "nuts", label: "Nuts" },
  { id: "peanuts", label: "Peanuts" },
  { id: "soy", label: "Soy" },
  { id: "fish", label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "pork", label: "Pork" },
  { id: "beef", label: "Beef" },
  { id: "poultry", label: "Chicken" },
];

export const NO_RESTRICTIONS: DietSettings = { diet: "none", exclude: [], avoidIngredients: [] };

/** Every tag the settings rule out: the diet's plus the explicit exclusions. */
export function excludedTags(settings: DietSettings): Set<FoodTag> {
  const diet = DIETS.find((d) => d.id === settings.diet);
  return new Set([...(diet?.excludes ?? []), ...settings.exclude]);
}

export function isIngredientAllowed(ingredient: Ingredient, settings: DietSettings): boolean {
  if (settings.avoidIngredients.includes(ingredient.key)) return false;
  const excluded = excludedTags(settings);
  return !ingredientTags(ingredient.key).some((tag) => excluded.has(tag));
}

/** A recipe is allowed only if every ingredient is, pantry staples included. */
export function isRecipeAllowed(recipe: Recipe, settings: DietSettings): boolean {
  return recipe.ingredients.every((i) => isIngredientAllowed(getIngredient(i.key), settings));
}

/** Short description for prompts and summaries, e.g. "vegetarian, no gluten, no nuts". */
export function describeRestrictions(settings: DietSettings): string {
  const parts: string[] = [];
  if (settings.diet !== "none") parts.push(settings.diet);
  for (const tag of settings.exclude) {
    const label = EXCLUSIONS.find((e) => e.id === tag)?.label.toLowerCase() ?? tag;
    parts.push(`no ${label}`);
  }
  for (const key of settings.avoidIngredients) parts.push(`no ${getIngredient(key).nameEn.toLowerCase()}`);
  return parts.join(", ");
}

/** Fills in diet fields missing from settings saved by older versions. */
export function withDietDefaults<T extends Partial<DietSettings> & { vegetarian?: boolean }>(
  settings: T,
): T & DietSettings {
  return {
    ...settings,
    diet: settings.diet ?? (settings.vegetarian ? "vegetarian" : "none"),
    exclude: Array.isArray(settings.exclude) ? settings.exclude : [],
    avoidIngredients: Array.isArray(settings.avoidIngredients) ? settings.avoidIngredients : [],
  };
}
