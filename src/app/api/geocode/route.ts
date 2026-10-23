import { NextResponse } from "next/server";

/**
 * Looks up a Swedish place name or postcode with OpenStreetMap Nominatim.
 * Nominatim's usage policy asks for an identifying User-Agent and at most
 * one request per second, so results are cached.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ error: "q is required" }, { status: 400 });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("countrycodes", "se");
  url.searchParams.set("limit", "1");

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "recipe-calculator/0.1 (https://github.com/axel-otl/recipe-calculator)" },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error(`Nominatim responded ${response.status}`);
    const results = (await response.json()) as { lat: string; lon: string; display_name: string }[];
    if (!results.length) return NextResponse.json({ error: `Couldn't find "${query}"` }, { status: 404 });
    const [first] = results;
    return NextResponse.json({ lat: Number(first.lat), lng: Number(first.lon), label: first.display_name });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Place search failed: ${message}` }, { status: 502 });
  }
}
