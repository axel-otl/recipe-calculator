import { cached } from "./providers/http";

/**
 * OpenStreetMap Nominatim lookups. Its usage policy asks for an identifying
 * User-Agent and at most one request per second, so results are cached.
 */

const HEADERS = { "User-Agent": "recipe-calculator/0.1 (https://github.com/axel-otl/recipe-calculator)" };
const DAY_MS = 24 * 60 * 60 * 1000;

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

async function nominatim(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`https://nominatim.openstreetmap.org/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("format", "json");
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Nominatim responded ${response.status}`);
  return response.json();
}

/** Finds a Swedish place name or postcode. */
export function geocode(query: string): Promise<GeocodeResult | undefined> {
  return cached(`geocode:${query.toLowerCase()}`, DAY_MS, async () => {
    const results = (await nominatim("search", { q: query, countrycodes: "se", limit: "1" })) as {
      lat: string;
      lon: string;
      display_name: string;
    }[];
    const first = results[0];
    return first && { lat: Number(first.lat), lng: Number(first.lon), label: first.display_name };
  });
}

/** The Swedish postcode at a point, e.g. "75236". */
export function postcodeAt(lat: number, lng: number): Promise<string | undefined> {
  // ~1 km grid, so nearby lookups share a cache entry.
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  return cached(`postcode:${key}`, DAY_MS, async () => {
    const result = (await nominatim("reverse", {
      lat: lat.toFixed(4),
      lon: lng.toFixed(4),
      zoom: "18",
      addressdetails: "1",
    })) as { address?: { postcode?: string } };
    const postcode = result.address?.postcode?.replace(/\D/g, "");
    return postcode && postcode.length === 5 ? postcode : undefined;
  });
}
