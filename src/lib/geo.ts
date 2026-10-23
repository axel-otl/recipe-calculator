import type { Store, StoreWithDistance } from "./types";

const EARTH_RADIUS_KM = 6371;

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function storesNear(stores: Store[], lat: number, lng: number, radiusKm: number): StoreWithDistance[] {
  return stores
    .map((store) => ({ ...store, distanceKm: distanceKm(lat, lng, store.lat, store.lng) }))
    .filter((store) => store.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
