import { CHAIN_LABELS, type Chain, type DataSource, type Offer, type Store } from "../types";
import { axfoodProvider } from "./axfood";
import { coopProvider } from "./coop";
import { cached } from "./http";
import { icaProvider } from "./ica";
import { lidlProvider } from "./lidl";
import { sampleProvider } from "./sample";
import type { Area, StoreProvider } from "./types";

/** Live providers by chain. A chain without one is only available as sample data. */
const LIVE_PROVIDERS: StoreProvider[] = [
  axfoodProvider("willys"),
  axfoodProvider("hemkop"),
  coopProvider,
  icaProvider,
  lidlProvider,
];

const ALL_CHAINS = Object.keys(CHAIN_LABELS) as Chain[];
const STORES_TTL_MS = 24 * 60 * 60 * 1000;
const OFFERS_TTL_MS = 60 * 60 * 1000;

export interface ProviderResult<T> {
  data: T;
  /** Human-readable problems, e.g. a chain that couldn't be reached */
  notices: string[];
}

function providersFor(source: DataSource): StoreProvider[] {
  return source === "sample" ? [sampleProvider] : LIVE_PROVIDERS;
}

export function unsupportedLiveChains(): Chain[] {
  const live = new Set(LIVE_PROVIDERS.flatMap((p) => p.chains));
  return ALL_CHAINS.filter((c) => !live.has(c));
}

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

const chainNames = (provider: StoreProvider) => provider.chains.map((c) => CHAIN_LABELS[c]).join("/");

function providerStores(provider: StoreProvider, area: Area): Promise<Store[]> {
  // Area-sensitive providers do their own caching per area.
  if (provider.areaSensitive) return provider.listStores(area);
  return cached(`stores:${provider.id}`, STORES_TTL_MS, () => provider.listStores(area));
}

export async function listStores(source: DataSource, area: Area): Promise<ProviderResult<Store[]>> {
  const notices: string[] = [];
  if (source === "live") {
    const missing = unsupportedLiveChains().map((c) => CHAIN_LABELS[c]);
    if (missing.length) notices.push(`No live data source for ${missing.join(", ")} yet – switch to sample data to include them.`);
  }
  const providers = providersFor(source);
  const results = await Promise.allSettled(providers.map((p) => providerStores(p, area)));
  const stores: Store[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") stores.push(...result.value);
    else notices.push(`Couldn't load ${chainNames(providers[index])} stores: ${describeError(result.reason)}`);
  });
  return { data: stores, notices };
}

export async function getOffers(stores: Store[]): Promise<ProviderResult<Offer[]>> {
  const notices: string[] = [];
  const offers: Offer[] = [];
  const results = await Promise.allSettled(
    stores.map((store) => {
      const provider = providersFor(store.source).find((p) => p.chains.includes(store.chain));
      if (!provider) return Promise.reject(new Error("no provider for this chain"));
      return cached(`offers:${store.id}`, OFFERS_TTL_MS, () => provider.getOffers(store));
    }),
  );
  results.forEach((result, index) => {
    if (result.status === "fulfilled") offers.push(...result.value);
    else notices.push(`Couldn't load offers for ${stores[index].name}: ${describeError(result.reason)}`);
  });
  return { data: offers, notices };
}
