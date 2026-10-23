import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { INGREDIENTS, INGREDIENT_KEYS } from "./ingredients";
import type { Recipe } from "./types";

const MODEL = "claude-opus-5-5";

const RecipeSchema = z.object({
  recipes: z.array(
    z.object({
      name: z.string().describe("Recipe name in Swedish"),
      nameEn: z.string().describe("Recipe name in English"),
      timeMinutes: z.number().int(),
      mainIngredient: z.enum(INGREDIENT_KEYS),
      ingredients: z.array(
        z.object({
          key: z.enum(INGREDIENT_KEYS),
          amount: z.number().describe("Amount for 4 servings in the ingredient's unit (g, ml or st)"),
        }),
      ),
      steps: z.array(z.string()).describe("Short cooking steps in English"),
    }),
  ),
});

export interface AiRecipeRequest {
  /** Ingredient keys currently on offer, cheapest deals first */
  offerKeys: string[];
  kcalPerServing: number;
  budgetPerServing: number;
  vegetarian: boolean;
  count: number;
  /** Names of recipes already in the plan, to avoid duplicates */
  avoid: string[];
}

const SYSTEM = `You create practical weeknight dinner recipes for a Swedish household using
ingredients from a fixed catalog, so every ingredient can be priced against grocery
store offers. Only use ingredient keys from the catalog; amounts are for 4 servings
in the unit listed (g, ml or st). Salt, pepper and water are assumed and not listed.
Favour ingredients that are on offer, keep recipes realistic and varied, and keep
each one within the calorie and budget targets.`;

function catalogText(): string {
  return INGREDIENTS.map(
    (i) => `${i.key} | ${i.name} (${i.nameEn}) | unit ${i.unit} | ${i.kcal} kcal per ${i.unit === "st" ? "piece" : `100 ${i.unit}`} | ~${i.basePrice} kr per ${i.unit === "g" ? "kg" : i.unit === "ml" ? "l" : "piece"}${i.vegetarian ? "" : " | not vegetarian"}`,
  ).join("\n");
}

export async function generateRecipes(request: AiRecipeRequest): Promise<Recipe[]> {
  const client = new Anthropic();
  const prompt = [
    `Ingredient catalog (key | name | unit | energy | regular price):\n${catalogText()}`,
    `On offer this week, best deals first: ${request.offerKeys.join(", ") || "nothing in particular"}.`,
    `Create ${request.count} different dinner recipes.`,
    `Target about ${Math.round(request.kcalPerServing)} kcal and at most ${Math.round(request.budgetPerServing)} kr per serving.`,
    request.vegetarian ? "All recipes must be vegetarian." : "",
    request.avoid.length ? `Don't repeat these dishes: ${request.avoid.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(RecipeSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") throw new Error("The model declined to generate recipes.");
  if (!response.parsed_output) throw new Error("The model's response couldn't be parsed.");

  const vegetarianKeys = new Set(INGREDIENTS.filter((i) => i.vegetarian).map((i) => i.key));
  return response.parsed_output.recipes
    .filter((r) => r.ingredients.length > 0)
    .filter((r) => !request.vegetarian || r.ingredients.every((i) => vegetarianKeys.has(i.key)))
    .map((r, index) => ({
      id: `ai-${Date.now().toString(36)}-${index}`,
      name: r.name,
      nameEn: r.nameEn,
      servings: 4,
      timeMinutes: r.timeMinutes,
      mainIngredient: r.mainIngredient,
      ingredients: r.ingredients.filter((i) => i.amount > 0),
      steps: r.steps,
      source: "ai" as const,
    }));
}
