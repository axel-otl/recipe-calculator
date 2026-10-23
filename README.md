# Recipe Calculator

Plan a week of dinners from the grocery offers at your Swedish stores, within your budget and calorie goal, and get a shopping list grouped by store.

1. **Pick your stores.** Search a city, area or postcode, or use your location. Then choose up to six stores on the map or in the list.
2. **Set your goals:** total budget, calories per portion, portions per meal and number of meals. You can also choose vegetarian only.
3. **Get a meal plan.** The app prices every recipe against this week's offers. It adjusts portion sizes towards your calorie goal and picks varied meals that fit your budget. Swap any meal you don't like.
4. **Create AI recipes (optional).** Claude invents new recipes around what's on offer. The app prices them the same way as the built-in ones.
5. **Go shopping** with a checklist grouped by the store with the best price. You can copy it as text or print it.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY for AI recipes
npm run dev
```

Open http://localhost:3000.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build && npm start` | Production build |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

## Store data

The app has two data sources, and you can switch between them in the app:

- **Live:** real weekly offers from **Willys** and **Hemköp**. It reads the store-list and campaign JSON that their websites use (`src/lib/providers/axfood.ts`). These endpoints aren't a documented public API, so they can change without notice. The parser is defensive, and any failure shows up as a notice in the app instead of breaking it.
- **Sample data:** generated example stores and offers for ICA, Coop, Willys, Hemköp and Lidl in 15 Swedish cities. Store names are marked "(exempel)" and are not real stores. The offers change every week, so you can try the app without network access.

ICA, Coop and Lidl have no live source yet. Matpriskollen aggregates offers across all chains, but it sells that data commercially and has no public API. If you get access (info@matpriskollen.se), or find another licensed source, add a provider:

1. Implement `StoreProvider` (`src/lib/providers/types.ts`): `listStores()` returns stores with coordinates, and `getOffers(store)` returns that store's offers.
2. Add it to `LIVE_PROVIDERS` in `src/lib/providers/index.ts`.

Offers are matched to recipe ingredients by keyword (`src/lib/ingredients.ts`, `src/lib/matching.ts`). Two guards stop bad matches: an offer only counts if its price per kg/l/piece is a real discount, and it must be in a plausible range.

## How prices and calories work

- Each ingredient in the catalog has calories and an estimated regular price. When a selected store has an offer for an ingredient, the app uses the cheapest offer instead. Otherwise it uses the estimate, which is shown under "Any store (no current offer)".
- Recipe costs are for the amounts the recipe uses, not whole packages.
- Portions are scaled between 60% and 160% to approach your calorie goal.
- The planner prefers cheap meals that use offers and avoids repeating the main ingredient. It also makes sure the remaining meals can still fit the budget.

## Project layout

```
src/
  app/                 Next.js pages and API routes (stores, offers, geocode, ai-recipes)
  components/          UI: store picker + map, goals, meal plan, offers, shopping list
  lib/
    ingredients.ts     Ingredient catalog (kcal, regular prices, store keywords)
    recipes.ts         Built-in recipes
    planner.ts         Portion scaling, pricing and meal selection
    shoppingList.ts    Shopping list grouping and formatting
    ai.ts              Claude recipe generation (structured output)
    providers/         Store data sources (live Axfood, sample data)
```

Maps use OpenStreetMap tiles, and place search uses OpenStreetMap Nominatim.
