import type { Chain, Offer, Store } from "../types";

/** A source of stores and current offers for one or more grocery chains. */
export interface StoreProvider {
  id: string;
  chains: Chain[];
  listStores(): Promise<Store[]>;
  getOffers(store: Store): Promise<Offer[]>;
}
