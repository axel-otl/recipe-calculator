import type { Chain, Offer, PriceUnit, Store } from "../types";
import type { StoreProvider } from "./types";

/**
 * Willys and Hemköp (both Axfood) serve store lists and weekly campaigns as
 * JSON from the same endpoints their websites use. These endpoints are not
 * a documented public API and can change without notice, so everything is
 * parsed defensively.
 */

const BASE_URLS: Partial<Record<Chain, string>> = {
  willys: "https://www.willys.se",
  hemkop: "https://www.hemkop.se",
};

const HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; recipe-calculator/0.1)",
};

const REQUEST_TIMEOUT_MS = 15_000;

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    // Let Next.js cache responses for an hour.
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.json();
}

type Json = Record<string, unknown>;

const asObject = (value: unknown): Json | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : typeof value === "number" ? String(value) : undefined;

/** Parses numbers like 49.9, "49,90", "49,90 kr" or "98,00 kr/kg". */
export function parsePrice(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const object = asObject(value);
  if (object) return parsePrice(object.value ?? object.formattedValue);
  if (typeof value !== "string") return undefined;
  const match = value.replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)/);
  return match ? parseFloat(match[1].replace(",", ".")) : undefined;
}

export function parseUnit(value: unknown): PriceUnit | undefined {
  const text = asString(value)?.toLowerCase();
  if (!text) return undefined;
  if (/\bkg\b|kilo/.test(text)) return "kg";
  if (/\bl\b|liter|litre/.test(text)) return "l";
  if (/\bst\b|styck|\bp\b|förp/.test(text)) return "st";
  return undefined;
}

export function parseStores(data: unknown, chain: Chain): Store[] {
  const list = Array.isArray(data) ? data : (asObject(data)?.stores ?? asObject(data)?.results);
  if (!Array.isArray(list)) return [];
  const stores: Store[] = [];
  for (const entry of list) {
    const raw = asObject(entry);
    if (!raw) continue;
    const id = asString(raw.storeId ?? raw.id);
    const geo = asObject(raw.geoPoint) ?? raw;
    const lat = Number(geo.latitude ?? geo.lat);
    const lng = Number(geo.longitude ?? geo.lng ?? geo.lon);
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
    const address = asObject(raw.address);
    const city = asString(address?.town ?? address?.city ?? raw.town);
    stores.push({
      id: `live:${chain}:${id}`,
      chain,
      chainStoreId: id,
      name: asString(raw.name ?? raw.displayName) ?? `${chain} ${id}`,
      address: asString(address?.formattedAddress) ?? [asString(address?.line1), city].filter(Boolean).join(", "),
      city,
      lat,
      lng,
      source: "live",
    });
  }
  return stores;
}

function parseValidTo(value: unknown): string | undefined {
  if (typeof value === "number") return new Date(value).toISOString().slice(0, 10);
  const text = asString(value);
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

export function parseCampaigns(data: unknown, store: Store): Offer[] {
  const results = asObject(data)?.results ?? asObject(data)?.items;
  if (!Array.isArray(results)) return [];
  const offers: Offer[] = [];
  for (const entry of results) {
    const product = asObject(entry);
    if (!product) continue;
    const name = asString(product.name);
    const promotions = Array.isArray(product.potentialPromotions) ? product.potentialPromotions : [];
    const promotion = asObject(promotions[0]);
    if (!name) continue;

    const regularPrice = parsePrice(product.priceValue ?? product.price);
    const qualifyingCount = Number(promotion?.qualifyingCount) || 1;
    const promoTotal = parsePrice(promotion?.price ?? promotion?.rewardValue);
    // Multi-buy offers ("2 för 50 kr") give the price for all qualifying items.
    const price =
      promoTotal !== undefined && qualifyingCount > 1 && regularPrice !== undefined && promoTotal > regularPrice
        ? promoTotal / qualifyingCount
        : (promoTotal ?? regularPrice);
    if (price === undefined) continue;

    const unitPrice = parsePrice(promotion?.comparePrice) ?? parsePrice(product.comparePrice);
    const unit = parseUnit(promotion?.comparePriceUnit ?? product.comparePriceUnit ?? product.comparePrice);
    const label =
      asString(promotion?.conditionLabel) ??
      asString(promotion?.textLabel) ??
      asString(promotion?.redeemLimitLabel) ??
      `${price.toLocaleString("sv-SE")} kr`;
    const code = asString(product.code) ?? name;

    offers.push({
      id: `${store.id}:${code}`,
      storeId: store.id,
      chain: store.chain,
      name,
      brand: asString(product.manufacturer),
      packageSize: asString(product.displayVolume),
      price,
      priceLabel: label,
      unitPrice,
      unit,
      regularPrice,
      validTo: parseValidTo(promotion?.validUntil ?? promotion?.endDate),
    });
  }
  return offers;
}

export function axfoodProvider(chain: "willys" | "hemkop"): StoreProvider {
  const base = BASE_URLS[chain]!;
  return {
    id: `axfood-${chain}`,
    chains: [chain],
    async listStores() {
      return parseStores(await fetchJson(`${base}/axfood/rest/store?online=false`), chain);
    },
    async getOffers(store) {
      const url = `${base}/search/campaigns/offline?q=${encodeURIComponent(store.chainStoreId)}&type=PERSONAL_GENERAL&page=0&size=500`;
      return parseCampaigns(await fetchJson(url), store);
    },
  };
}
