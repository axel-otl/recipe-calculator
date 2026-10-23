"use client";

import { useMemo, useState } from "react";
import { getIngredient } from "@/lib/ingredients";
import { offerUnitPrice } from "@/lib/pricing";
import { formatSek } from "@/lib/shoppingList";
import { CHAIN_LABELS, type Offer, type Store } from "@/lib/types";
import { CHAIN_COLORS } from "./chainColors";

interface Props {
  offers: Offer[];
  stores: Store[];
  loading: boolean;
  notices: string[];
}

export default function OffersView({ offers, stores, loading, notices }: Props) {
  const [query, setQuery] = useState("");
  const [onlyUsable, setOnlyUsable] = useState(true);
  const storesById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offers
      .filter((o) => !onlyUsable || o.ingredientKey)
      .filter((o) => !q || o.name.toLowerCase().includes(q) || o.brand?.toLowerCase().includes(q))
      .map((o) => {
        const ingredient = o.ingredientKey ? getIngredient(o.ingredientKey) : undefined;
        const unitPrice = ingredient ? offerUnitPrice(ingredient, o) : undefined;
        const discount = ingredient && unitPrice ? 1 - unitPrice / ingredient.basePrice : undefined;
        return { offer: o, ingredient, discount };
      })
      .sort((a, b) => (b.discount ?? -1) - (a.discount ?? -1));
  }, [offers, query, onlyUsable]);

  if (stores.length === 0) return <p className="text-sm text-muted">Select stores to see their offers.</p>;

  return (
    <div className="space-y-3">
      {notices.map((n) => (
        <p key={n} className="rounded-lg bg-warn-soft p-2 text-xs text-warn">
          {n}
        </p>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search offers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="!w-auto flex-1"
          aria-label="Search offers"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyUsable} onChange={(e) => setOnlyUsable(e.target.checked)} />
          Only recipe ingredients
        </label>
      </div>
      <p className="text-xs text-muted">
        {loading ? "Loading offers…" : `${rows.length} of ${offers.length} offers`}
      </p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {rows.slice(0, 300).map(({ offer, ingredient, discount }) => {
          const store = storesById.get(offer.storeId);
          return (
            <li key={offer.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHAIN_COLORS[offer.chain] }} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {offer.name}
                  {offer.brand && <span className="font-normal text-muted"> · {offer.brand}</span>}
                </p>
                <p className="truncate text-xs text-muted">
                  {store?.name ?? CHAIN_LABELS[offer.chain]}
                  {ingredient && ` · used as ${ingredient.nameEn.toLowerCase()}`}
                  {offer.validTo && ` · until ${offer.validTo}`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-deal">{offer.priceLabel}</p>
                <p className="text-xs text-muted">
                  {offer.unitPrice && offer.unit ? `${formatSek(offer.unitPrice)}/${offer.unit}` : offer.packageSize}
                  {discount !== undefined && discount > 0.02 && ` · −${Math.round(discount * 100)}%`}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
