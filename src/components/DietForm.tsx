"use client";

import { DIETS, excludedTags, EXCLUSIONS } from "@/lib/diet";
import { getIngredient, INGREDIENTS } from "@/lib/ingredients";
import type { DietSettings, FoodTag } from "@/lib/types";

interface Props {
  settings: DietSettings;
  onChange: (patch: Partial<DietSettings>) => void;
  /** How many recipes fit the current restrictions, out of how many */
  matching: number;
  total: number;
}

export default function DietForm({ settings, onChange, matching, total }: Props) {
  const fromDiet = new Set(DIETS.find((d) => d.id === settings.diet)?.excludes ?? []);
  const excluded = excludedTags(settings);
  const avoidable = INGREDIENTS.filter((i) => !settings.avoidIngredients.includes(i.key)).sort((a, b) =>
    a.nameEn.localeCompare(b.nameEn),
  );

  function toggle(tag: FoodTag) {
    const exclude = settings.exclude.includes(tag)
      ? settings.exclude.filter((t) => t !== tag)
      : [...settings.exclude, tag];
    onChange({ exclude });
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">3. Diet & allergies</h2>

      <div>
        <p className="mb-1 text-sm font-medium">Diet</p>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-border p-1 text-sm sm:grid-cols-4 lg:grid-cols-2" role="radiogroup" aria-label="Diet">
          {DIETS.map((diet) => (
            <button
              key={diet.id}
              type="button"
              role="radio"
              aria-checked={settings.diet === diet.id}
              onClick={() => onChange({ diet: diet.id })}
              className={`rounded-md px-2 py-1.5 ${settings.diet === diet.id ? "bg-accent text-white" : "text-muted hover:bg-surface-muted"}`}
            >
              {diet.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">Leave out (allergies & dislikes)</p>
        <div className="flex flex-wrap gap-1.5">
          {EXCLUSIONS.map(({ id, label }) => {
            const byDiet = fromDiet.has(id);
            const active = excluded.has(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                disabled={byDiet}
                onClick={() => toggle(id)}
                title={byDiet ? "Already left out by your diet" : undefined}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  active
                    ? "border-deal bg-deal-soft text-deal"
                    : "border-border text-muted hover:border-foreground hover:text-foreground"
                } ${byDiet ? "cursor-default opacity-60" : ""}`}
              >
                {active ? "✕ " : ""}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Avoid specific ingredients</span>
          <select
            value=""
            onChange={(e) => e.target.value && onChange({ avoidIngredients: [...settings.avoidIngredients, e.target.value] })}
          >
            <option value="">Add an ingredient…</option>
            {avoidable.map((i) => (
              <option key={i.key} value={i.key}>
                {i.nameEn} ({i.name})
              </option>
            ))}
          </select>
        </label>
        {settings.avoidIngredients.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {settings.avoidIngredients.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onChange({ avoidIngredients: settings.avoidIngredients.filter((k) => k !== key) })}
                  className="rounded-full border border-deal bg-deal-soft px-2.5 py-1 text-xs text-deal"
                  title="Remove"
                >
                  {getIngredient(key).nameEn} ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className={`text-xs ${matching < 3 ? "text-warn" : "text-muted"}`}>
        {matching} of {total} recipes fit.
        {matching < 3 && " Try “Create AI recipes” for more ideas that fit your diet."}
        {excluded.size > 0 && " Always check product labels if you have a serious allergy."}
      </p>
    </section>
  );
}
