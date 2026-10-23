import type { Offer, PriceUnit, Store } from "../types";
import { asArray, asObject, asString, fetchJson, fetchText, HttpError, parseDate, parsePrice } from "./http";
import type { StoreProvider } from "./types";

/**
 * Coop's website talks to Azure API Management endpoints. The subscription
 * keys are public – they're embedded in coop.se's HTML – so they're read from
 * there at runtime instead of being hard-coded, and refreshed if rejected.
 *
 * Stores come from Coop's e-commerce store list (the stores that have an
 * online range, with coordinates); offers are each store's promotions from
 * Coop's product search. None of this is a documented public API.
 */

const HOME = "https://www.coop.se/";
const PERSONALIZATION = "https://external.api.coop.se/personalization";
const ECOMMERCE = "https://external.api.coop.se/ecommerce/coop";
const SEARCH_PARAMS = "api-version=v2&groups=CUSTOMER_PRIVATE&device=desktop&direct=false";
const PAGE_SIZE = 100;
const MAX_PAGES = 6;

type KeyName = "personalizationApiSubscriptionKey" | "hybrisApiSubscriptionKey";

export function extractKey(html: string, field: KeyName): string | undefined {
  return new RegExp(`"${field}"\\s*:\\s*"([0-9a-f]{32})"`).exec(html)?.[1];
}

let keysPromise: Promise<string> | undefined;

function homepage(): Promise<string> {
  keysPromise ??= fetchText(HOME).catch((error) => {
    keysPromise = undefined;
    throw error;
  });
  return keysPromise;
}

async function key(field: KeyName): Promise<string> {
  const value = extractKey(await homepage(), field);
  if (!value) throw new Error("couldn't find Coop's API key on coop.se – the site has probably changed");
  return value;
}

/** Calls a Coop API, refreshing the keys once if they've been rotated. */
async function coopRequest(url: string, field: KeyName, body?: unknown): Promise<unknown> {
  const send = async () =>
    fetchJson(url, {
      method: body === undefined ? "GET" : "POST",
      body,
      headers: { "Ocp-Apim-Subscription-Key": await key(field) },
    });
  try {
    return await send();
  } catch (error) {
    if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
      keysPromise = undefined;
      return send();
    }
    throw error;
  }
}

export function parseCoopStores(data: unknown): Store[] {
  const stores: Store[] = [];
  for (const entry of asArray(asObject(data)?.pointOfServices ?? data)) {
    const raw = asObject(entry);
    // `name` holds the 6-digit ledger number the search API wants.
    const ledger = asString(raw?.name);
    const geo = asObject(raw?.geoPoint);
    const lat = Number(geo?.latitude);
    const lng = Number(geo?.longitude);
    if (!raw || !ledger || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
    const address = asObject(raw.address);
    const city = asString(address?.town);
    stores.push({
      id: `live:coop:${ledger}`,
      chain: "coop",
      chainStoreId: ledger,
      name: asString(raw.displayName) ?? `Coop ${ledger}`,
      address: [asString(address?.line1), city].filter(Boolean).join(", "),
      city,
      lat,
      lng,
      source: "live",
    });
  }
  return stores;
}

const SIZE_UNITS: [RegExp, string][] = [
  [/^kilo/, "kg"],
  [/^gram|^g$/, "g"],
  [/^liter|^l$/, "l"],
  [/^deciliter|^dl$/, "dl"],
  [/^centiliter|^cl$/, "cl"],
  [/^milliliter|^ml$/, "ml"],
  [/^styck|^st$/, "st"],
];

function packageLabel(product: Record<string, unknown>): string | undefined {
  const size = parsePrice(product.packageSize);
  const unitText = asString(product.packageSizeUnit)?.toLowerCase() ?? "";
  const unit = SIZE_UNITS.find(([pattern]) => pattern.test(unitText.replace(/^ungefärlig\s*/, "")))?.[1];
  if (size && unit) return `${unitText.startsWith("ungefärlig") ? "ca " : ""}${size} ${unit}`;
  return asString(product.packageSizeInformation);
}

function compareUnit(value: unknown): PriceUnit | undefined {
  const unit = asString(asObject(value)?.unit)?.toLowerCase();
  return unit === "kg" ? "kg" : unit === "liter" || unit === "l" ? "l" : unit === "styck" || unit === "st" ? "st" : undefined;
}

export function parseCoopPromotions(data: unknown, store: Store): Offer[] {
  const offers: Offer[] = [];
  for (const entry of asArray(asObject(asObject(data)?.results)?.items)) {
    const product = asObject(entry);
    const name = asString(product?.name);
    const promotion = asObject(asArray(product?.onlinePromotions)[0]);
    if (!product || !name || !promotion) continue;

    const byWeight = asString(product.salesUnit) === "Vikt";
    const regularPrice = parsePrice(byWeight ? product.salesPriceData : product.piecePriceData);
    const required = Number(promotion.numberOfProductRequired) || 1;
    const promoPrice = parsePrice(promotion.priceData);
    // Multi-buy ("2 för 50 kr") quotes the price for all the items together.
    const price =
      promoPrice !== undefined && required > 1 && regularPrice !== undefined && promoPrice > regularPrice
        ? promoPrice / required
        : (promoPrice ?? regularPrice);
    if (price === undefined) continue;

    const member = promotion.medMeraRequired === true;
    const label =
      asString(promotion.message) ??
      (required > 1 ? `${required} för ${Math.round(price * required)} kr` : `${price.toLocaleString("sv-SE")} kr${byWeight ? "/kg" : ""}`);

    offers.push({
      id: `${store.id}:${asString(product.ean) ?? asString(product.id) ?? name}`,
      storeId: store.id,
      chain: "coop",
      name,
      brand: asString(product.manufacturerName),
      packageSize: byWeight ? undefined : packageLabel(product),
      price,
      priceLabel: member ? `${label} (medlemspris)` : label,
      unitPrice: parsePrice(promotion.comparativePrice) ?? parsePrice(product.comparativePriceData),
      unit: byWeight ? "kg" : compareUnit(product.comparativePriceUnit),
      regularPrice,
      validTo: parseDate(promotion.endDate ?? promotion.validTo ?? promotion.to),
    });
  }
  return offers;
}

export const coopProvider: StoreProvider = {
  id: "coop",
  chains: ["coop"],
  async listStores() {
    return parseCoopStores(
      await coopRequest(
        `${ECOMMERCE}/pointofservices?query=&pageSize=500&fields=FULL&api-version=v1`,
        "hybrisApiSubscriptionKey",
      ),
    );
  },
  async getOffers(store) {
    const url = `${PERSONALIZATION}/search/products/promotions?${SEARCH_PARAMS}&store=${encodeURIComponent(store.chainStoreId)}`;
    const offers: Offer[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await coopRequest(url, "personalizationApiSubscriptionKey", {
        resultsOptions: { skip: page * PAGE_SIZE, take: PAGE_SIZE, sortBy: [], facets: [] },
      });
      offers.push(...parseCoopPromotions(data, store));
      const count = Number(asObject(asObject(data)?.results)?.count) || 0;
      if ((page + 1) * PAGE_SIZE >= count) break;
    }
    return offers;
  },
};
