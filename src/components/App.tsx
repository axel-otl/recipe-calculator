"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getIngredient } from "@/lib/ingredients";
import { planMeals } from "@/lib/planner";
import { buildPriceTable } from "@/lib/pricing";
import { RECIPES } from "@/lib/recipes";
import { buildShoppingList } from "@/lib/shoppingList";
import type { DataSource, Offer, PlanSettings, Recipe, Store, StoreWithDistance } from "@/lib/types";
import GoalsForm from "./GoalsForm";
import MealPlanView from "./MealPlanView";
import OffersView from "./OffersView";
import ShoppingListView from "./ShoppingListView";
import StorePicker, { type Place } from "./StorePicker";
import { usePersistentState } from "./usePersistentState";

const MAX_STORES = 6;

const DEFAULT_SETTINGS: PlanSettings = {
  budget: 700,
  kcalPerServing: 650,
  servings: 4,
  meals: 5,
  vegetarian: false,
  havePantry: true,
};

const DEFAULT_PLACE: Place = { lat: 59.3293, lng: 18.0686, label: "Stockholm" };

type Tab = "plan" | "list" | "offers";

export default function App() {
  const [source, setSource] = usePersistentState<DataSource>("rc.source", "sample");
  const [place, setPlace] = usePersistentState<Place | null>("rc.place", DEFAULT_PLACE);
  const [radiusKm, setRadiusKm] = usePersistentState("rc.radius", 5);
  const [selected, setSelected, selectedLoaded] = usePersistentState<Store[]>("rc.stores", []);
  const [settings, setSettings] = usePersistentState<PlanSettings>("rc.settings", DEFAULT_SETTINGS);
  const [aiRecipes, setAiRecipes] = usePersistentState<Recipe[]>("rc.aiRecipes", []);
  const [excluded, setExcluded] = usePersistentState<string[]>("rc.excluded", []);
  const [checked, setChecked] = usePersistentState<Record<string, boolean>>("rc.checked", {});

  const [stores, setStores] = useState<StoreWithDistance[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storeNotices, setStoreNotices] = useState<string[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerNotices, setOfferNotices] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("plan");
  const autoSelected = useRef(false);

  // Stores near the chosen place.
  useEffect(() => {
    if (!place) return;
    const controller = new AbortController();
    setStoresLoading(true);
    fetch(`/api/stores?source=${source}&lat=${place.lat}&lng=${place.lng}&radius=${radiusKm}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        setStores(data.stores ?? []);
        setStoreNotices(data.notices ?? (data.error ? [data.error] : []));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setStoreNotices([`Couldn't load stores: ${e.message}`]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setStoresLoading(false);
      });
    return () => controller.abort();
  }, [source, place, radiusKm]);

  // First visit: pre-select the nearest store of a few different chains.
  useEffect(() => {
    if (!selectedLoaded || autoSelected.current || selected.length > 0 || stores.length === 0) return;
    autoSelected.current = true;
    const picks: Store[] = [];
    for (const store of stores) {
      if (picks.length >= 3) break;
      if (!picks.some((p) => p.chain === store.chain)) picks.push(stripDistance(store));
    }
    setSelected(picks);
  }, [selectedLoaded, selected.length, stores, setSelected]);

  // Offers for the selected stores.
  const selectedKey = selected.map((s) => s.id).sort().join(",");
  useEffect(() => {
    if (!selectedLoaded) return;
    if (selected.length === 0) {
      setOffers([]);
      setOfferNotices([]);
      return;
    }
    const controller = new AbortController();
    setOffersLoading(true);
    fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stores: selected }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        setOffers(data.offers ?? []);
        setOfferNotices(data.notices ?? (data.error ? [data.error] : []));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setOfferNotices([`Couldn't load offers: ${e.message}`]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setOffersLoading(false);
      });
    return () => controller.abort();
    // `selectedKey` captures the selection; the array itself changes identity on every load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, selectedLoaded]);

  const priceTable = useMemo(() => buildPriceTable(offers, selected), [offers, selected]);
  const allRecipes = useMemo(() => [...RECIPES, ...aiRecipes], [aiRecipes]);
  const plan = useMemo(
    () => planMeals(allRecipes, settings, priceTable, excluded),
    [allRecipes, settings, priceTable, excluded],
  );
  const shoppingGroups = useMemo(() => buildShoppingList(plan.meals, settings), [plan.meals, settings]);

  function toggleStore(store: Store) {
    setSelected((current) => {
      if (current.some((s) => s.id === store.id)) return current.filter((s) => s.id !== store.id);
      if (current.length >= MAX_STORES) return current;
      return [...current, stripDistance(store)];
    });
  }

  function swap(recipeId: string) {
    setExcluded((current) => [...current, recipeId]);
  }

  async function generateAi() {
    setAiLoading(true);
    setAiError(null);
    try {
      const offerKeys = [...priceTable.values()]
        .sort((a, b) => a.unitPrice / getIngredient(a.key).basePrice - b.unitPrice / getIngredient(b.key).basePrice)
        .map((p) => p.key);
      const response = await fetch("/api/ai-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerKeys,
          kcalPerServing: settings.kcalPerServing,
          budgetPerServing: Math.max(1, settings.budget / Math.max(1, settings.meals * settings.servings)),
          vegetarian: settings.vegetarian,
          count: 3,
          avoid: allRecipes.map((r) => r.name).slice(0, 30),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Couldn't create recipes");
      setAiRecipes((current) => [...current, ...(data.recipes as Recipe[])]);
      // Give the new recipes a chance in the plan.
      setExcluded([]);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "plan", label: `Meal plan (${plan.meals.length})` },
    { id: "list", label: "Shopping list" },
    { id: "offers", label: `Offers (${offers.filter((o) => o.ingredientKey).length})` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="no-print mb-6">
        <h1 className="text-2xl font-bold">Recipe Calculator</h1>
        <p className="text-sm text-muted">
          Pick your stores, set a budget and calorie goal, and get a meal plan built on this week&apos;s offers – with a
          shopping list.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <aside className="no-print space-y-6">
          <div className="rounded-xl border border-border bg-surface p-4">
            <StorePicker
              source={source}
              onSourceChange={setSource}
              place={place}
              onPlaceChange={setPlace}
              radiusKm={radiusKm}
              onRadiusChange={setRadiusKm}
              stores={stores}
              loading={storesLoading}
              notices={storeNotices}
              selected={selected}
              onToggle={toggleStore}
              maxSelected={MAX_STORES}
            />
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <GoalsForm settings={settings} onChange={setSettings} />
          </div>
        </aside>

        <main className="min-w-0">
          <nav className="no-print mb-4 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${tab === t.id ? "bg-accent text-white" : "text-muted hover:bg-surface-muted"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          {offersLoading && tab !== "offers" && <p className="mb-3 text-xs text-muted">Updating prices from offers…</p>}

          {tab === "plan" && (
            <MealPlanView
              plan={plan}
              settings={settings}
              onSwap={swap}
              onResetSwaps={() => setExcluded([])}
              swapsActive={excluded.length > 0}
              onGenerateAi={generateAi}
              aiLoading={aiLoading}
              aiError={aiError}
              aiCount={aiRecipes.length}
              onClearAi={() => setAiRecipes([])}
              hasStores={selected.length > 0}
            />
          )}
          {tab === "list" && <ShoppingListView groups={shoppingGroups} checked={checked} onCheckedChange={setChecked} />}
          {tab === "offers" && (
            <OffersView offers={offers} stores={selected} loading={offersLoading} notices={offerNotices} />
          )}
        </main>
      </div>
    </div>
  );
}

function stripDistance(store: Store): Store {
  const { id, chain, chainStoreId, name, address, city, lat, lng, source } = store;
  return { id, chain, chainStoreId, name, address, city, lat, lng, source };
}
