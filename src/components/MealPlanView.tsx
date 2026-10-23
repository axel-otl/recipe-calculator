"use client";

import { useState } from "react";
import { formatAmount, formatSek } from "@/lib/shoppingList";
import { CHAIN_LABELS, type MealPlan, type PlanSettings, type PricedRecipe } from "@/lib/types";

interface Props {
  plan: MealPlan;
  settings: PlanSettings;
  onSwap: (recipeId: string) => void;
  onResetSwaps: () => void;
  swapsActive: boolean;
  onGenerateAi: () => void;
  aiLoading: boolean;
  aiError: string | null;
  aiCount: number;
  onClearAi: () => void;
  hasStores: boolean;
}

function MealCard({ meal, settings, onSwap }: { meal: PricedRecipe; settings: PlanSettings; onSwap: () => void }) {
  const [open, setOpen] = useState(false);
  const { recipe } = meal;
  return (
    <li className="rounded-xl border border-border bg-surface">
      <div className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{recipe.name}</h3>
            {recipe.source === "ai" && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-strong">AI recipe</span>
            )}
          </div>
          <p className="text-sm text-muted">{recipe.nameEn}</p>
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <div>
              <dt className="inline text-muted">Cost </dt>
              <dd className="inline font-medium">{formatSek(meal.totalCost)}</dd>
              <span className="text-muted"> ({formatSek(meal.costPerServing)}/portion)</span>
            </div>
            <div>
              <dt className="inline text-muted">Energy </dt>
              <dd className="inline font-medium">{Math.round(meal.kcalPerServing)} kcal</dd>
              <span className="text-muted">/portion</span>
            </div>
            <div>
              <dt className="inline text-muted">Time </dt>
              <dd className="inline font-medium">{recipe.timeMinutes} min</dd>
            </div>
            {meal.offerCount > 0 && (
              <div className="text-deal">
                {meal.offerCount} on offer · saves {formatSek(meal.savings)}
              </div>
            )}
          </dl>
          {Math.abs(meal.portionScale - 1) >= 0.05 && (
            <p className="mt-1 text-xs text-muted">
              Portions {meal.portionScale > 1 ? "enlarged" : "reduced"} to {Math.round(meal.portionScale * 100)}% to hit
              your calorie goal.
            </p>
          )}
        </div>
        <div className="no-print flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface-muted"
            aria-expanded={open}
          >
            {open ? "Hide" : "Recipe"}
          </button>
          <button
            type="button"
            onClick={onSwap}
            className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface-muted"
            title="Replace with another recipe"
          >
            Swap
          </button>
        </div>
      </div>
      {open && (
        <div className="grid gap-4 border-t border-border p-4 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold">Ingredients for {settings.servings} portions</h4>
            <ul className="space-y-1 text-sm">
              {meal.lines.map((line) => {
                const pantry = line.ingredient.pantry && settings.havePantry;
                return (
                  <li key={line.ingredient.key} className="flex justify-between gap-2">
                    <span>
                      {formatAmount(line.amount, line.ingredient.unit)} {line.ingredient.name.toLowerCase()}
                      {line.price.source === "offer" && line.price.store && (
                        <span className="ml-1 text-xs text-deal">
                          offer at {CHAIN_LABELS[line.price.store.chain]}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-muted">{pantry ? "pantry" : formatSek(line.cost)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold">Method</h4>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {recipe.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </li>
  );
}

export default function MealPlanView(props: Props) {
  const { plan, settings } = props;
  const budgetUsed = settings.budget > 0 ? plan.totalCost / settings.budget : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total cost" value={formatSek(plan.totalCost)} tone={plan.withinBudget ? undefined : "warn"} />
        <Stat label="Budget left" value={formatSek(settings.budget - plan.totalCost)} tone={plan.withinBudget ? undefined : "warn"} />
        <Stat
          label="Per portion"
          value={formatSek(plan.totalCost / Math.max(1, plan.meals.length * settings.servings))}
        />
        <Stat label="Saved with offers" value={formatSek(plan.totalSavings)} tone="deal" />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
        <div
          className={`h-full ${plan.withinBudget ? "bg-accent" : "bg-warn"}`}
          style={{ width: `${Math.min(100, budgetUsed * 100)}%` }}
        />
      </div>

      {!props.hasStores && (
        <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
          Pick at least one store to price recipes with real offers. Until then, costs are estimated regular prices.
        </p>
      )}
      {!plan.withinBudget && plan.meals.length > 0 && (
        <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
          These are the cheapest meals available, but they still cost {formatSek(plan.totalCost - settings.budget)} more
          than your budget. Try fewer meals, smaller portions, more stores, or a larger budget.
        </p>
      )}
      {plan.meals.length < settings.meals && (
        <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
          Only {plan.meals.length} recipes match your settings. Generate AI recipes or reset swaps for more.
        </p>
      )}

      <ul className="space-y-3">
        {plan.meals.map((meal) => (
          <MealCard key={meal.recipe.id} meal={meal} settings={settings} onSwap={() => props.onSwap(meal.recipe.id)} />
        ))}
      </ul>

      <div className="no-print flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border p-4">
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">Want new ideas?</p>
          <p className="text-muted">
            Have AI create recipes around this week&apos;s offers
            {props.aiCount > 0 ? ` (${props.aiCount} AI recipes added so far)` : ""}.
          </p>
        </div>
        <button
          type="button"
          onClick={props.onGenerateAi}
          disabled={props.aiLoading}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60"
        >
          {props.aiLoading ? "Creating recipes…" : "Create AI recipes"}
        </button>
        {props.aiCount > 0 && (
          <button type="button" onClick={props.onClearAi} className="text-sm text-muted hover:text-foreground">
            Remove AI recipes
          </button>
        )}
        {props.swapsActive && (
          <button type="button" onClick={props.onResetSwaps} className="text-sm text-muted hover:text-foreground">
            Reset swaps
          </button>
        )}
        {props.aiError && <p className="w-full text-sm text-warn">{props.aiError}</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" | "deal" }) {
  const color = tone === "warn" ? "text-warn" : tone === "deal" ? "text-deal" : "";
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
