import { postcodeAt } from "../nominatim";
import type { Offer, Store } from "../types";
import { asArray, asObject, asString, cached, fetchJson, fetchText, parseDate, parsePrice, parseUnit } from "./http";
import type { Area, StoreProvider } from "./types";

/**
 * ICA has no public offers API. Stores near a postcode come from the store
 * lookup that ICA's online shop uses; each store's weekly offers are read
 * from the JSON embedded in its offers page,
 * https://www.ica.se/erbjudanden/<store-slug>/. ICA sits behind bot
 * protection that rate-limits automated traffic, so it's kept to one page
 * request per store (and results are cached, see ./index.ts).
 */

const STORE_LOOKUP = "https://handla.ica.se/api/store/v1";
const OFFERS_PAGE = "https://www.ica.se/erbjudanden/";
const HOUR_MS = 60 * 60 * 1000;

/** "ICA Supermarket Vagnhärad" + 1004281 → "ica-supermarket-vagnharad-1004281" */
export function icaSlug(name: string, storeId: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${storeId}`;
}

export function parseIcaStores(data: unknown): Store[] {
  const stores = new Map<string, Store>();
  // Stores come in several lists (home delivery, pick-up); merge them.
  const lists = Array.isArray(data) ? [data] : Object.values(asObject(data) ?? {}).filter(Array.isArray);
  for (const list of lists) {
    for (const entry of list as unknown[]) {
      const raw = asObject(entry);
      const id = asString(raw?.id);
      const name = asString(raw?.name);
      const lat = Number(raw?.latitude);
      const lng = Number(raw?.longitude);
      if (!raw || !id || !name || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
      const city = asString(raw.city);
      stores.set(id, {
        id: `live:ica:${id}`,
        chain: "ica",
        chainStoreId: id,
        name,
        address: [asString(raw.street), city].filter(Boolean).join(", "),
        city,
        lat,
        lng,
        source: "live",
      });
    }
  }
  return [...stores.values()];
}

/**
 * Pulls `window.__INITIAL_DATA__ = {...}` out of the offers page. It's a
 * JavaScript literal rather than strict JSON, so a few constructs are
 * normalised first.
 */
export function extractInitialData(html: string): unknown {
  const marker = "window.__INITIAL_DATA__ =";
  const start = html.indexOf(marker);
  if (start < 0) return undefined;
  const end = html.indexOf("</script>", start);
  let text = html
    .slice(start + marker.length, end < 0 ? undefined : end)
    .trim()
    .replace(/;\s*$/, "")
    .replace(/([:[,]\s*)undefined\b/g, "$1null")
    .replace(/new Map\(\[\]\)/g, "null");
  // Drop anything after the object (further statements in the same script).
  const last = text.lastIndexOf("}");
  if (last >= 0) text = text.slice(0, last + 1);
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function parseIcaOffers(data: unknown, store: Store): Offer[] {
  const offers: Offer[] = [];
  for (const entry of asArray(asObject(asObject(data)?.offers)?.weeklyOffers)) {
    const offer = asObject(entry);
    const details = asObject(offer?.details);
    const name = asString(details?.name);
    if (!offer || !details || !name) continue;

    const mechanics = asObject(offer.parsedMechanics);
    const quantity = Number(mechanics?.quantity) || 1;
    const total = parsePrice(mechanics?.value2) ?? parsePrice(details.mechanicInfo);
    const perUnit = asString(mechanics?.value4) ?? "";
    // Percentage discounts and "köp 3 betala för 2" have no fixed price to use.
    if (total === undefined || asString(mechanics?.benefitType)?.toUpperCase() === "PERCENT") continue;
    const price = total / quantity;
    const loose = /\/\s*kg/i.test(perUnit) || /kr\/kg/i.test(asString(details.mechanicInfo) ?? "");

    const comparison = asString(offer.comparisonPrice);
    const restriction = asString(offer.restriction);
    const mechanicInfo = asString(details.mechanicInfo) ?? `${price.toLocaleString("sv-SE")} kr`;
    const storeInfo = asObject(asArray(offer.stores)[0]);

    offers.push({
      id: `${store.id}:${asString(offer.id) ?? name}`,
      storeId: store.id,
      chain: "ica",
      name,
      brand: asString(details.brand),
      packageSize: loose ? undefined : asString(details.packageInformation),
      price,
      priceLabel: restriction ? `${mechanicInfo} (${restriction})` : mechanicInfo,
      unitPrice: loose ? price : parsePrice(comparison),
      unit: loose ? "kg" : parseUnit(comparison),
      regularPrice: parsePrice(storeInfo?.regularPrice),
      validTo: parseDate(offer.validTo),
    });
  }
  return offers;
}

export const icaProvider: StoreProvider = {
  id: "ica",
  chains: ["ica"],
  areaSensitive: true,
  async listStores(area: Area) {
    const postcode = await postcodeAt(area.lat, area.lng);
    if (!postcode) throw new Error("couldn't work out a postcode for this location");
    return cached(`ica:stores:${postcode}`, 24 * HOUR_MS, async () =>
      parseIcaStores(await fetchJson(`${STORE_LOOKUP}?zip=${postcode}&customerType=B2C`)),
    );
  },
  async getOffers(store) {
    const html = await fetchText(`${OFFERS_PAGE}${icaSlug(store.name, store.chainStoreId)}/`);
    const data = extractInitialData(html);
    if (!data) throw new Error("couldn't read the offers on ICA's page – the site has probably changed");
    return parseIcaOffers(data, store);
  },
};
