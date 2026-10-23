import { CHAIN_LABELS, type Chain, type DataSource, type Offer, type Store } from "../types";
import { axfoodProvider } from "./axfood";
import { sampleProvider } from "./sample";
import type { StoreProvider } from "./types";

/**
 * Live providers by chain. ICA, Coop and Lidl have no supported live source
 * yet; add a provider here (for example one backed by a licensed price-data
 * API) to bring them online.
 */
const LIVE_PROVIDERS: StoreProvider[] = [axfoodProvider("willys"), axfoodProvider("hemkop")];

const ALL_CHAINS = Object.keys(CHAIN_LABELS) as Chain[];

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

export async function listStores(source: DataSource): Promise<ProviderResult<Store[]>> {
  const notices: string[] = [];
  if (source === "live") {
    const missing = unsupportedLiveChains().map((c) => CHAIN_LABELS[c]);
    if (missing.length) notices.push(`No live data source for ${missing.join(", ")} yet – switch to sample data to include them.`);
  }
  const results = await Promise.allSettled(providersFor(source).map((p) => p.listStores()));
  const stores: Store[] = [];
  results.forEach((result, index) => {
    const provider = providersFor(source)[index];
    if (result.status === "fulfilled") stores.push(...result.value);
    else notices.push(`Couldn't load ${provider.chains.map((c) => CHAIN_LABELS[c]).join("/")} stores: ${describeError(result.reason)}`);
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
      return provider.getOffers(store);
    }),
  );
  results.forEach((result, index) => {
    if (result.status === "fulfilled") offers.push(...result.value);
    else notices.push(`Couldn't load offers for ${stores[index].name}: ${describeError(result.reason)}`);
  });
  return { data: offers, notices };
}
