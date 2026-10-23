"use client";

import { useState } from "react";
import { formatAmount, formatSek, shoppingListText } from "@/lib/shoppingList";
import type { ShoppingGroup } from "@/lib/types";

interface Props {
  groups: ShoppingGroup[];
  checked: Record<string, boolean>;
  onCheckedChange: (checked: Record<string, boolean>) => void;
}

export default function ShoppingListView({ groups, checked, onCheckedChange }: Props) {
  const [copied, setCopied] = useState(false);
  const total = groups.reduce((sum, g) => sum + g.total, 0);
  const itemCount = groups.reduce((sum, g) => sum + g.items.length, 0);
  const doneCount = groups.flatMap((g) => g.items).filter((i) => checked[i.ingredient.key]).length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shoppingListText(groups));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (itemCount === 0) return <p className="text-sm text-muted">Your shopping list appears once you have a meal plan.</p>;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm text-muted">
          {doneCount}/{itemCount} items · about {formatSek(total)}
        </p>
        <button type="button" onClick={copy} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted">
          {copied ? "Copied!" : "Copy as text"}
        </button>
        <button type="button" onClick={() => window.print()} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted">
          Print
        </button>
        {doneCount > 0 && (
          <button type="button" onClick={() => onCheckedChange({})} className="text-sm text-muted hover:text-foreground">
            Uncheck all
          </button>
        )}
      </div>

      {groups.map((group) => (
        <section key={group.storeId} className="rounded-xl border border-border bg-surface">
          <header className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-3">
            <h3 className="font-semibold">{group.title}</h3>
            <span className="shrink-0 text-sm text-muted">≈ {formatSek(group.total)}</span>
          </header>
          <ul className="divide-y divide-border">
            {group.items.map((item) => {
              const done = !!checked[item.ingredient.key];
              const offer = item.price.offer;
              return (
                <li key={item.ingredient.key}>
                  <label className="flex cursor-pointer items-start gap-3 px-4 py-2.5 text-sm hover:bg-surface-muted">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={done}
                      onChange={(e) => onCheckedChange({ ...checked, [item.ingredient.key]: e.target.checked })}
                    />
                    <span className={`min-w-0 flex-1 ${done ? "text-muted line-through" : ""}`}>
                      <span className="font-medium">{item.ingredient.name}</span>{" "}
                      <span>{formatAmount(item.amount, item.ingredient.unit)}</span>
                      {offer && (
                        <span className="block text-xs text-deal">
                          {offer.name} – {offer.priceLabel}
                        </span>
                      )}
                      <span className="block text-xs text-muted">For: {item.recipes.join(", ")}</span>
                    </span>
                    <span className="shrink-0 text-muted">{formatSek(item.cost)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="text-xs text-muted">
        Costs are for the amounts the recipes use; whole packages may cost more. Items without an offer use estimated
        regular prices.
      </p>
    </div>
  );
}
