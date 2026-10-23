export type Chain = "ica" | "coop" | "willys" | "hemkop" | "lidl";

export const CHAIN_LABELS: Record<Chain, string> = {
  ica: "ICA",
  coop: "Coop",
  willys: "Willys",
  hemkop: "Hemköp",
  lidl: "Lidl",
};

export type DataSource = "live" | "sample";

export interface Store {
  /** Globally unique: `${source}:${chain}:${chainStoreId}` */
  id: string;
  chain: Chain;
  chainStoreId: string;
  name: string;
  address?: string;
  city?: string;
  lat: number;
  lng: number;
  source: DataSource;
}

export interface StoreWithDistance extends Store {
  distanceKm: number;
}

/** The unit a comparison price is expressed in. */
export type PriceUnit = "kg" | "l" | "st";

export interface Offer {
  id: string;
  storeId: string;
  chain: Chain;
  name: string;
  brand?: string;
  /** Package description, e.g. "900 g" */
  packageSize?: string;
  /** Promotion price for one package (or per kg for loose goods), SEK */
  price: number;
  /** Human-readable promotion, e.g. "2 för 35 kr" */
  priceLabel: string;
  /** Comparison price, SEK per `unit` */
  unitPrice?: number;
  unit?: PriceUnit;
  regularPrice?: number;
  validTo?: string;
  /** Ingredient catalog key this offer was matched to, if any */
  ingredientKey?: string;
}

export type IngredientUnit = "g" | "ml" | "st";

export interface Ingredient {
  key: string;
  /** Swedish name, as it appears in stores */
  name: string;
  /** English name */
  nameEn: string;
  unit: IngredientUnit;
  /** kcal per 100 g / 100 ml, or per piece for unit "st" */
  kcal: number;
  /** Estimated regular price in SEK per kg / l / piece */
  basePrice: number;
  /** Lower-case substrings that identify this ingredient in a product name */
  keywords: string[];
  /** Lower-case substrings that disqualify a product name */
  exclude?: string[];
  /** Weight of one piece, lets "st" ingredients use per-kg offers and vice versa */
  pieceGrams?: number;
  /** Cheap staples most kitchens already have (oil, spices, stock cubes) */
  pantry?: boolean;
  vegetarian: boolean;
  category: IngredientCategory;
}

export type IngredientCategory =
  | "meat"
  | "fish"
  | "dairy"
  | "protein-veg"
  | "carbs"
  | "vegetables"
  | "canned"
  | "pantry";

export interface RecipeIngredient {
  key: string;
  /** Amount in the ingredient's unit for the recipe's base servings */
  amount: number;
}

export interface Recipe {
  id: string;
  name: string;
  nameEn: string;
  servings: number;
  timeMinutes: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  /** Ingredient key of the main protein, used to keep a plan varied */
  mainIngredient: string;
  source: "library" | "ai";
}

export interface IngredientPrice {
  key: string;
  /** SEK per kg / l / piece */
  unitPrice: number;
  source: "offer" | "estimate";
  offer?: Offer;
  store?: Store;
}

export interface PlanSettings {
  /** Total budget for all meals, SEK */
  budget: number;
  /** Target kcal per portion */
  kcalPerServing: number;
  /** Portions per meal */
  servings: number;
  /** Number of meals to plan */
  meals: number;
  vegetarian: boolean;
  /** Leave pantry staples out of costs and the shopping list */
  havePantry: boolean;
}

export interface PricedIngredientLine {
  ingredient: Ingredient;
  /** Amount needed, in the ingredient's unit, scaled to the plan */
  amount: number;
  cost: number;
  price: IngredientPrice;
}

export interface PricedRecipe {
  recipe: Recipe;
  /** Portion-size multiplier applied to hit the calorie goal */
  portionScale: number;
  kcalPerServing: number;
  costPerServing: number;
  totalCost: number;
  /** SEK saved versus estimated regular prices, thanks to offers */
  savings: number;
  offerCount: number;
  lines: PricedIngredientLine[];
}

export interface MealPlan {
  meals: PricedRecipe[];
  totalCost: number;
  totalSavings: number;
  withinBudget: boolean;
  /** Recipes that weren't picked, cheapest first */
  alternatives: PricedRecipe[];
}

export interface PackagePurchase {
  count: number;
  /** Size of one package, in the ingredient's unit */
  size: number;
  /** Cost of all packages, SEK */
  cost: number;
}

export interface ShoppingItem {
  ingredient: Ingredient;
  amount: number;
  /** Cost of the amount the recipes use */
  cost: number;
  /** Whole packages to buy; undefined for goods sold by weight */
  packages?: PackagePurchase;
  price: IngredientPrice;
  recipes: string[];
}

export interface ShoppingGroup {
  /** Store id, or "estimate" for items without a matching offer */
  storeId: string;
  title: string;
  items: ShoppingItem[];
  total: number;
  /** What the group costs when buying whole packages */
  packageTotal: number;
}
