import { NextResponse } from "next/server";
import { geocode } from "@/lib/nominatim";

/** Looks up a Swedish place name or postcode. */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ error: "q is required" }, { status: 400 });

  try {
    const result = await geocode(query);
    if (!result) return NextResponse.json({ error: `Couldn't find "${query}"` }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Place search failed: ${message}` }, { status: 502 });
  }
}
