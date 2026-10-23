import { storesNear } from "@/lib/geo";
import { tagOffers } from "@/lib/pricing";
import { SAMPLE_CITIES, sampleOffers, sampleStores } from "@/lib/providers/sample";
import type { Store } from "@/lib/types";

/**
 * The demo runs without a server, so it answers the app's /api requests in
 * the browser with sample data. Live store data and AI recipes need the
 * full app.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const normalise = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

function handle(url: URL, init?: RequestInit): Response {
  switch (url.pathname) {
    case "/api/stores": {
      const lat = Number(url.searchParams.get("lat"));
      const lng = Number(url.searchParams.get("lng"));
      const radius = Number(url.searchParams.get("radius")) || 10;
      const notices =
        url.searchParams.get("source") === "live" ? ["Live store data needs the full app – showing sample data."] : [];
      return json({ stores: storesNear(sampleStores(), lat, lng, radius), notices });
    }
    case "/api/offers": {
      const { stores } = JSON.parse(String(init?.body ?? "{}")) as { stores: Store[] };
      return json({ offers: tagOffers(stores.flatMap((s) => sampleOffers(s))), notices: [] });
    }
    case "/api/geocode": {
      const query = normalise(url.searchParams.get("q") ?? "");
      const city = SAMPLE_CITIES.find((c) => normalise(c.name).startsWith(query) || query.includes(normalise(c.name)));
      if (!city) {
        return json(
          { error: `The demo knows these cities: ${SAMPLE_CITIES.map((c) => c.name).join(", ")}.` },
          404,
        );
      }
      return json({ lat: city.lat, lng: city.lng, label: city.name });
    }
    case "/api/ai-recipes":
      return json(
        { error: "AI recipes need the full app with an Anthropic API key – see the README to run it locally." },
        503,
      );
    default:
      return json({ error: "Not found" }, 404);
  }
}

export function installMockApi() {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
    if (!url.pathname.startsWith("/api/")) return realFetch(input, init);
    return handle(url, init);
  };
}
