"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { CHAIN_LABELS, type Chain, type DataSource, type Store, type StoreWithDistance } from "@/lib/types";
import { CHAIN_COLORS } from "./chainColors";
import { IS_DEMO } from "./demo";

// Leaflet needs `window`, so the map only renders in the browser.
const StoreMap = dynamic(() => import("./StoreMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-surface-muted" />,
});

export interface Place {
  lat: number;
  lng: number;
  label: string;
}

interface Props {
  source: DataSource;
  onSourceChange: (source: DataSource) => void;
  place: Place | null;
  onPlaceChange: (place: Place) => void;
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
  stores: StoreWithDistance[];
  loading: boolean;
  notices: string[];
  selected: Store[];
  onToggle: (store: Store) => void;
  maxSelected: number;
}

const RADII = [2, 5, 10, 20, 50];

export default function StorePicker(props: Props) {
  const { source, place, radiusKm, stores, loading, notices, selected, onToggle, maxSelected } = props;
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainFilter, setChainFilter] = useState<Chain | "all">("all");
  const selectedIds = new Set(selected.map((s) => s.id));

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Search failed");
      props.onPlaceChange({ lat: data.lat, lng: data.lng, label: data.label.split(",").slice(0, 2).join(",") });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location.");
      return;
    }
    setError(null);
    setSearching(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSearching(false);
        props.onPlaceChange({ lat: position.coords.latitude, lng: position.coords.longitude, label: "My location" });
      },
      (e) => {
        setSearching(false);
        setError(`Couldn't get your location: ${e.message}`);
      },
      { timeout: 10_000 },
    );
  }

  const visible = stores.filter((s) => chainFilter === "all" || s.chain === chainFilter);
  const chainsPresent = [...new Set(stores.map((s) => s.chain))];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">1. Your stores</h2>
        {!IS_DEMO && (
        <div className="flex rounded-lg border border-border p-0.5 text-xs" role="group" aria-label="Data source">
          {(["sample", "live"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => props.onSourceChange(s)}
              className={`rounded-md px-2 py-1 ${source === s ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}
              title={s === "live" ? "Real offers from ICA, Coop, Willys, Hemköp and Lidl" : "Generated example offers for all chains"}
            >
              {s === "live" ? "Live" : "Sample data"}
            </button>
          ))}
        </div>
        )}
      </div>
      <p className="text-xs text-muted">
        {IS_DEMO
          ? "Demo: made-up example stores and offers in 15 Swedish cities. Search a city like Uppsala or Malmö."
          : source === "live"
          ? "Live: this week's real offers from ICA, Coop, Willys, Hemköp and Lidl. Coop lists stores with online shopping."
          : "Sample data: made-up example stores and offers for ICA, Coop, Willys, Hemköp and Lidl, to try the app out."}
      </p>

      <form onSubmit={search} className="flex gap-2">
        <input
          type="search"
          placeholder="City, area or postcode"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="City, area or postcode"
        />
        <button
          type="submit"
          disabled={searching}
          className="shrink-0 rounded-lg bg-accent px-3 text-sm font-medium text-on-accent hover:bg-accent-strong disabled:opacity-60"
        >
          Search
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {!IS_DEMO && (
          <>
            <button type="button" onClick={useMyLocation} className="text-accent underline-offset-2 hover:underline">
              Use my location
            </button>
            <span className="text-muted">·</span>
          </>
        )}
        <label className="flex items-center gap-1 text-muted">
          Within
          <select
            value={radiusKm}
            onChange={(e) => props.onRadiusChange(Number(e.target.value))}
            className="!w-auto !py-0.5"
          >
            {RADII.map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </label>
        {place && <span className="truncate text-muted">of {place.label}</span>}
      </div>
      {error && <p className="rounded-lg bg-warn-soft p-2 text-sm text-warn">{error}</p>}

      {place && (
        <StoreMap
          center={place}
          radiusKm={radiusKm}
          stores={visible}
          selectedIds={selectedIds}
          onToggle={onToggle}
        />
      )}

      {notices.map((n) => (
        <p key={n} className="rounded-lg bg-warn-soft p-2 text-xs text-warn">
          {n}
        </p>
      ))}

      {place && (
        <div>
          <div className="mb-2 flex flex-wrap gap-1 text-xs">
            {(["all", ...chainsPresent] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChainFilter(c)}
                className={`rounded-full border px-2 py-0.5 ${chainFilter === c ? "border-accent bg-accent-soft text-accent-strong" : "border-border text-muted"}`}
              >
                {c === "all" ? `All (${stores.length})` : CHAIN_LABELS[c]}
              </button>
            ))}
          </div>
          {loading ? (
            <p className="text-sm text-muted">Finding stores…</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted">No stores found here. Try a larger radius{source === "live" ? " or sample data" : ""}.</p>
          ) : (
            <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface">
              {visible.slice(0, 60).map((store) => {
                const isSelected = selectedIds.has(store.id);
                const disabled = !isSelected && selected.length >= maxSelected;
                return (
                  <li key={store.id}>
                    <label className={`flex items-center gap-2 px-3 py-2 text-sm ${disabled ? "opacity-50" : "cursor-pointer hover:bg-surface-muted"}`}>
                      <input type="checkbox" checked={isSelected} disabled={disabled} onChange={() => onToggle(store)} />
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHAIN_COLORS[store.chain] }} />
                      <span className="min-w-0 flex-1 truncate">{store.name}</span>
                      <span className="shrink-0 text-xs text-muted">{store.distanceKm.toFixed(1)} km</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="text-sm">
          <p className="mb-1 font-medium">
            Selected ({selected.length}/{maxSelected})
          </p>
          <ul className="flex flex-wrap gap-1">
            {selected.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onToggle(s)}
                  className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs hover:border-deal"
                  title="Remove"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: CHAIN_COLORS[s.chain] }} />
                  {s.name} ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
