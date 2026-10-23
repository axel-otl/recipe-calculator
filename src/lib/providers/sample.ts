import { INGREDIENTS } from "../ingredients";
import type { Chain, Ingredient, Offer, Store } from "../types";
import type { StoreProvider } from "./types";

/**
 * Generated example stores and offers, so the app works without network
 * access to the chains. Store names are marked "(exempel)" and do not refer
 * to real stores; offers change every ISO week.
 */

const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Stockholm", lat: 59.3293, lng: 18.0686 },
  { name: "Göteborg", lat: 57.7089, lng: 11.9746 },
  { name: "Malmö", lat: 55.605, lng: 13.0038 },
  { name: "Uppsala", lat: 59.8586, lng: 17.6389 },
  { name: "Västerås", lat: 59.6099, lng: 16.5448 },
  { name: "Örebro", lat: 59.2741, lng: 15.2066 },
  { name: "Linköping", lat: 58.4108, lng: 15.6214 },
  { name: "Helsingborg", lat: 56.0465, lng: 12.6945 },
  { name: "Jönköping", lat: 57.7826, lng: 14.1618 },
  { name: "Norrköping", lat: 58.5877, lng: 16.1924 },
  { name: "Lund", lat: 55.7047, lng: 13.191 },
  { name: "Umeå", lat: 63.8258, lng: 20.263 },
  { name: "Gävle", lat: 60.6749, lng: 17.1413 },
  { name: "Sundsvall", lat: 62.3908, lng: 17.3069 },
  { name: "Luleå", lat: 65.5848, lng: 22.1547 },
];

const STORES_PER_CITY: Record<Chain, number> = { ica: 3, coop: 2, willys: 2, hemkop: 1, lidl: 1 };
const AREAS = ["Centrum", "Norra", "Södra", "Västra", "Östra"];

/** How expensive each chain is relative to the catalog's regular prices. */
const PRICE_LEVEL: Record<Chain, number> = { ica: 1.03, coop: 1.05, willys: 0.93, hemkop: 1.04, lidl: 0.9 };

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

function endOfWeek(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() + ((7 - (d.getDay() || 7)) % 7));
  return d.toISOString().slice(0, 10);
}

export function sampleStores(): Store[] {
  const stores: Store[] = [];
  for (const city of CITIES) {
    for (const chain of Object.keys(STORES_PER_CITY) as Chain[]) {
      for (let n = 0; n < STORES_PER_CITY[chain]; n++) {
        const random = rng(hash(`${city.name}-${chain}-${n}`));
        const chainStoreId = `${city.name.toLowerCase()}-${n + 1}`;
        const area = AREAS[(n + hash(chain)) % AREAS.length];
        // Spread stores up to ~4 km from the city centre.
        const lat = city.lat + (random() - 0.5) * 0.07;
        const lng = city.lng + (random() - 0.5) * 0.14;
        stores.push({
          id: `sample:${chain}:${chainStoreId}`,
          chain,
          chainStoreId,
          name: `${chainName(chain)} ${city.name} ${area} (exempel)`,
          city: city.name,
          address: `${area}, ${city.name}`,
          lat,
          lng,
          source: "sample",
        });
      }
    }
  }
  return stores;
}

function chainName(chain: Chain): string {
  return { ica: "ICA", coop: "Coop", willys: "Willys", hemkop: "Hemköp", lidl: "Lidl" }[chain];
}

/** Package size in the ingredient's unit, and a label for it. */
function samplePackage(ingredient: Ingredient, random: () => number): { size: number; label: string } {
  const pick = <T,>(options: T[]) => options[Math.floor(random() * options.length)];
  if (ingredient.unit === "st") {
    const size = { agg: pick([12, 15, 24]), tortilla: 8, hamburgerbrod: 4, buljong: 6 }[ingredient.key] ?? 1;
    return { size, label: `${size} st` };
  }
  if (ingredient.unit === "ml") {
    const size = ingredient.key === "kokosmjolk" ? 400 : pick([500, 1000]);
    return { size, label: size >= 1000 ? `${size / 1000} l` : `${size / 100} dl` };
  }
  const sizes: Record<string, number[]> = {
    meat: [500, 700, 900, 1000],
    fish: [400, 500, 800],
    "protein-veg": [200, 400, 500],
    dairy: [200, 450, 500],
    carbs: [500, 1000],
    vegetables: [250, 500, 1000],
    canned: [380, 400, 500],
    pantry: [100, 200],
  };
  const size = pick(sizes[ingredient.category]);
  return { size, label: size >= 1000 ? `${size / 1000} kg` : `${size} g` };
}

export function sampleOffers(store: Store, date = new Date()): Offer[] {
  const random = rng(hash(`${store.id}-${isoWeek(date)}`));
  const validTo = endOfWeek(date);
  const offers: Offer[] = [];
  for (const ingredient of INGREDIENTS) {
    // Roughly a third of products are on offer each week; pantry items less often.
    if (random() > (ingredient.pantry ? 0.15 : 0.35)) continue;
    const discount = 0.12 + random() * 0.3;
    const regular = ingredient.basePrice * PRICE_LEVEL[store.chain] * (0.95 + random() * 0.1);
    const unitPrice = Math.round(regular * (1 - discount) * 100) / 100;
    const pack = samplePackage(ingredient, random);
    const loose = ingredient.category === "vegetables" && ingredient.unit === "g" && random() < 0.5;
    const packPrice = loose ? unitPrice : (unitPrice * pack.size) / (ingredient.unit === "st" ? 1 : 1000);
    const price = Math.max(5, Math.round(packPrice) - (random() < 0.6 ? 0.1 : 0));
    const multiBuy = !loose && random() < 0.25;
    const priceLabel = loose
      ? `${price.toLocaleString("sv-SE")} kr/kg`
      : multiBuy
        ? `2 för ${Math.round(price * 2)} kr`
        : `${price.toLocaleString("sv-SE")} kr`;
    offers.push({
      id: `${store.id}:${ingredient.key}`,
      storeId: store.id,
      chain: store.chain,
      name: loose ? `${ingredient.name} i lösvikt` : `${ingredient.name} ${pack.label}`,
      packageSize: loose ? undefined : pack.label,
      price,
      priceLabel,
      unitPrice,
      unit: ingredient.unit === "g" ? "kg" : ingredient.unit === "ml" ? "l" : "st",
      regularPrice: Math.round(regular * (loose ? 1 : pack.size / (ingredient.unit === "st" ? 1 : 1000))),
      validTo,
      ingredientKey: ingredient.key,
    });
  }
  return offers;
}

export const sampleProvider: StoreProvider = {
  id: "sample",
  chains: ["ica", "coop", "willys", "hemkop", "lidl"],
  listStores: async () => sampleStores(),
  getOffers: async (store) => sampleOffers(store),
};
