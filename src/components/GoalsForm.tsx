"use client";

import type { PlanSettings } from "@/lib/types";

interface Props {
  settings: PlanSettings;
  onChange: (settings: PlanSettings) => void;
}

const NUMBER_FIELDS: { key: "budget" | "kcalPerServing" | "servings" | "meals"; label: string; hint: string; min: number; max: number; step: number }[] = [
  { key: "budget", label: "Budget (kr)", hint: "for all meals together", min: 50, max: 10000, step: 50 },
  { key: "kcalPerServing", label: "Calories per portion", hint: "portion sizes adjust to this", min: 200, max: 2000, step: 50 },
  { key: "servings", label: "Portions per meal", hint: "people × meals you want leftovers for", min: 1, max: 20, step: 1 },
  { key: "meals", label: "Number of meals", hint: "different dishes to plan", min: 1, max: 14, step: 1 },
];

export default function GoalsForm({ settings, onChange }: Props) {
  const set = (patch: Partial<PlanSettings>) => onChange({ ...settings, ...patch });

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">2. Your goals</h2>
      <div className="grid grid-cols-2 gap-3">
        {NUMBER_FIELDS.map((field) => (
          <label key={field.key} className="text-sm">
            <span className="mb-1 block font-medium">{field.label}</span>
            <input
              type="number"
              inputMode="numeric"
              min={field.min}
              max={field.max}
              step={field.step}
              value={settings[field.key]}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isFinite(value)) set({ [field.key]: value });
              }}
              onBlur={(e) => {
                const value = Math.min(field.max, Math.max(field.min, Number(e.target.value) || field.min));
                set({ [field.key]: value });
              }}
            />
            <span className="mt-0.5 block text-xs text-muted">{field.hint}</span>
          </label>
        ))}
      </div>
      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.vegetarian} onChange={(e) => set({ vegetarian: e.target.checked })} />
          Vegetarian only
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.havePantry} onChange={(e) => set({ havePantry: e.target.checked })} />
          I already have oil, spices, garlic and stock cubes
        </label>
      </div>
    </section>
  );
}
