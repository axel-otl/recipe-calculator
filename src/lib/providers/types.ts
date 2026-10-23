import type { Chain, Offer, Store } from "../types";

export interface Area {
  lat: number;
  lng: number;
}

/** A source of stores and current offers for one or more grocery chains. */
export interface StoreProvider {
  id: string;
  chains: Chain[];
  /**
   * Stores the provider knows about. `area` is the user's location, for
   * providers that can only look stores up near a place; others return
   * every store and the caller filters by distance.
   */
  listStores(area: Area): Promise<Store[]>;
  /** Whether `listStores` depends on `area` (affects caching). */
  areaSensitive?: boolean;
  getOffers(store: Store): Promise<Offer[]>;
}
