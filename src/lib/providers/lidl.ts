import type { Offer, PriceUnit, Store } from "../types";
import { asArray, asObject, asString, fetchJson, parseDate, parsePrice } from "./http";
import type { StoreProvider } from "./types";

/**
 * Lidl's weekly offers come from the backend of the Lidl Plus app, whose
 * store and offer routes don't need a login. They're used by the app, not
 * documented for third parties, and can change without notice.
 */

const COUNTRY = "SE";
const STORES_URL = `https://stores.lidlplus.com/api/v4/${COUNTRY}`;
const OFFERS_URL = `https://offers.lidlplus.com/app/api/v4/${COUNTRY}`;
const APP_VERSION = "17.0.5";

const HEADERS = {
  "Accept-Language": "sv-SE",
  "User-Agent": `LidlPlus/${APP_VERSION} Android okhttp/4.12.0`,
  "X-Client-Version": APP_VERSION,
  "X-Client-Platform": "android",
};

export function parseLidlStores(data: unknown): Store[] {
  const list = Array.isArray(data) ? data : asArray(asObject(data)?.stores ?? asObject(data)?.items);
  const stores: Store[] = [];
  for (const entry of list) {
    const raw = asObject(entry);
    const key = asString(raw?.storeKey);
    const location = asObject(raw?.location);
    const lat = Number(location?.latitude);
    const lng = Number(location?.longitude);
    if (!raw || !key || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
    const city = asString(raw.locality);
    const name = asString(raw.name);
    stores.push({
      id: `live:lidl:${key}`,
      chain: "lidl",
      chainStoreId: key,
      name: name && /lidl/i.test(name) ? name : `Lidl ${name ?? city ?? key}`,
      address: [asString(raw.address), city].filter(Boolean).join(", "),
      city,
      lat,
      lng,
      source: "live",
    });
  }
  return stores;
}

/** "1 kg = 39,80 kr", "1 l = 12.45" or "kg-pris 39,80" → price per kg / l / st. */
export function parsePricePerUnit(text: string | undefined): { unitPrice: number; unit: PriceUnit } | undefined {
  if (!text) return undefined;
  const normalised = text.toLowerCase().replace(/\s+/g, " ");
  const match = normalised.match(/(\d+(?:[.,]\d+)?)?\s*(kg|g|l|ml|st)\b[^=\d]*=\s*(\d+(?:[.,:]\d+)?)/);
  if (!match) return undefined;
  const quantity = match[1] ? parseFloat(match[1].replace(",", ".")) : 1;
  const price = parseFloat(match[3].replace(/[,:]/, "."));
  if (!quantity || !Number.isFinite(price)) return undefined;
  switch (match[2]) {
    case "kg":
      return { unitPrice: price / quantity, unit: "kg" };
    case "g":
      return { unitPrice: (price / quantity) * 1000, unit: "kg" };
    case "l":
      return { unitPrice: price / quantity, unit: "l" };
    case "ml":
      return { unitPrice: (price / quantity) * 1000, unit: "l" };
    default:
      return { unitPrice: price / quantity, unit: "st" };
  }
}

export function parseLidlOffers(data: unknown, store: Store): Offer[] {
  const offers: Offer[] = [];
  for (const entry of asArray(asObject(data)?.offers)) {
    const offer = asObject(entry);
    const title = asString(offer?.title);
    const box = asObject(offer?.priceBox);
    if (!offer || !title || !box) continue;
    // `largePart` is the offer price, `smallPart` the price before the discount.
    const price = parsePrice(asString(box.largePartString) ?? box.largePartNumeric);
    if (price === undefined) continue;
    const regularPrice = parsePrice(asString(box.smallPartString) ?? box.smallPartNumeric);
    const perUnit = parsePricePerUnit(asString(offer.pricePerUnit));
    const discount = asString(box.discountMessage)?.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰⁾]/g, "").trim();
    const label = `${price.toLocaleString("sv-SE")} kr`;

    offers.push({
      id: `${store.id}:${asString(offer.id) ?? title}`,
      storeId: store.id,
      chain: "lidl",
      name: title,
      brand: asString(offer.brand),
      packageSize: asString(offer.packaging),
      price,
      priceLabel: discount ? `${label} (${discount})` : label,
      unitPrice: perUnit?.unitPrice,
      unit: perUnit?.unit,
      regularPrice,
      validTo: parseDate(offer.endValidityDate),
    });
  }
  return offers;
}

export const lidlProvider: StoreProvider = {
  id: "lidl",
  chains: ["lidl"],
  async listStores() {
    return parseLidlStores(await fetchJson(STORES_URL, { headers: HEADERS }));
  },
  async getOffers(store) {
    const url = `${OFFERS_URL}/${encodeURIComponent(store.chainStoreId)}/offers`;
    return parseLidlOffers(await fetchJson(url, { headers: HEADERS }), store);
  },
};
