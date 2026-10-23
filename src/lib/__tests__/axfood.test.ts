import { describe, expect, it } from "vitest";
import { parseCampaigns, parseStores } from "../providers/axfood";
import { parsePrice, parseUnit } from "../providers/http";
import type { Store } from "../types";

// Shaped after the JSON the Willys/Hemköp websites load. These endpoints are
// undocumented, so the parser is tested against the fields it relies on.
const STORES_RESPONSE = [
  {
    storeId: "2110",
    name: "Willys Uppsala Stenhagen",
    address: { line1: "Stenhagens Centrum", postalCode: "752 61", town: "Uppsala" },
    geoPoint: { latitude: 59.8471, longitude: 17.5843 },
  },
  { storeId: "9999", name: "Online only", geoPoint: { latitude: 0, longitude: 0 } },
];

const CAMPAIGNS_RESPONSE = {
  results: [
    {
      code: "101234_ST",
      name: "Kycklingfilé Fryst",
      manufacturer: "Garant",
      displayVolume: "1kg",
      priceValue: 119.0,
      comparePrice: "119,00 kr",
      comparePriceUnit: "kg",
      potentialPromotions: [
        {
          price: { value: 89.0 },
          comparePrice: "89,00 kr",
          conditionLabel: "89 kr/st",
          validUntil: 1793404800000,
          qualifyingCount: 1,
        },
      ],
    },
    {
      code: "100555_ST",
      name: "Krossade Tomater",
      displayVolume: "400g",
      priceValue: 14.9,
      comparePriceUnit: "kg",
      potentialPromotions: [{ price: 20, conditionLabel: "2 för 20 kr", qualifyingCount: 2 }],
    },
    { code: "broken" },
  ],
};

const store: Store = {
  id: "live:willys:2110",
  chain: "willys",
  chainStoreId: "2110",
  name: "Willys Uppsala Stenhagen",
  lat: 59.8471,
  lng: 17.5843,
  source: "live",
};

describe("axfood parsing", () => {
  it("parses prices and units", () => {
    expect(parsePrice("98,00 kr")).toBe(98);
    expect(parsePrice({ value: 12.5 })).toBe(12.5);
    expect(parseUnit("kr/kg")).toBe("kg");
    expect(parseUnit("l")).toBe("l");
  });

  it("parses stores and skips ones without a location", () => {
    const stores = parseStores(STORES_RESPONSE, "willys");
    expect(stores).toHaveLength(1);
    expect(stores[0]).toMatchObject({ id: "live:willys:2110", city: "Uppsala", lat: 59.8471 });
  });

  it("parses campaigns, including multi-buy offers", () => {
    const offers = parseCampaigns(CAMPAIGNS_RESPONSE, store);
    expect(offers).toHaveLength(2);
    expect(offers[0]).toMatchObject({ price: 89, unitPrice: 89, unit: "kg", priceLabel: "89 kr/st", packageSize: "1kg" });
    expect(offers[0].validTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // "2 för 20 kr" → 10 kr each
    expect(offers[1].price).toBe(10);
  });

  it("returns nothing for unexpected shapes", () => {
    expect(parseStores({ unexpected: true }, "hemkop")).toEqual([]);
    expect(parseCampaigns(null, store)).toEqual([]);
  });
});
