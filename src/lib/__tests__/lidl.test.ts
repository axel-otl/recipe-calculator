import { describe, expect, it } from "vitest";
import { matchIngredient } from "../matching";
import { parseLidlOffers, parseLidlStores, parsePricePerUnit } from "../providers/lidl";
import type { Store } from "../types";

// Shaped after the Lidl Plus app's store and offer responses (fields the
// parser relies on). The endpoints are undocumented.

const store: Store = {
  id: "live:lidl:SE0123",
  chain: "lidl",
  chainStoreId: "SE0123",
  name: "Lidl Uppsala Gränby",
  lat: 59.87,
  lng: 17.67,
  source: "live",
};

describe("lidl", () => {
  it("parses stores", () => {
    const stores = parseLidlStores([
      { storeKey: "SE0123", name: "Uppsala Gränby", address: "Marknadsgatan 1", postalCode: "75323", locality: "Uppsala", location: { latitude: 59.87, longitude: 17.67 } },
      { storeKey: "SE0999", name: "Lidl Nowhere", location: { latitude: 0, longitude: 0 } },
    ]);
    expect(stores).toHaveLength(1);
    expect(stores[0]).toMatchObject({ id: "live:lidl:SE0123", name: "Lidl Uppsala Gränby", address: "Marknadsgatan 1, Uppsala", city: "Uppsala" });
  });

  it.each([
    ["1 kg = 39,80 kr", { unitPrice: 39.8, unit: "kg" }],
    ["100 g = 4,50", { unitPrice: 45, unit: "kg" }],
    ["1 l = 12.45", { unitPrice: 12.45, unit: "l" }],
    ["1 st = 3,33", { unitPrice: 3.33, unit: "st" }],
  ] as const)("parses price per unit %s", (text, expected) => {
    const result = parsePricePerUnit(text)!;
    expect(result.unit).toBe(expected.unit);
    expect(result.unitPrice).toBeCloseTo(expected.unitPrice);
  });

  it("parses offers from the price box", () => {
    const offers = parseLidlOffers(
      {
        totalOffers: 2,
        offers: [
          {
            id: "100",
            title: "Kycklingfilé",
            brand: "Lidl",
            packaging: "900 g",
            pricePerUnit: "1 kg = 99,89 kr",
            endValidityDate: "2026-10-25T23:59:59Z",
            priceBox: { largePartString: "89,90", smallPartString: "119,90", discountMessage: "-25%¹", priceSymbol: "kr" },
          },
          { id: "101", title: "No price" },
        ],
      },
      store,
    );
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({
      price: 89.9,
      regularPrice: 119.9,
      unit: "kg",
      packageSize: "900 g",
      priceLabel: "89,9 kr (-25%)",
      validTo: "2026-10-25",
    });
    expect(offers[0].unitPrice).toBeCloseTo(99.89);
    expect(matchIngredient(offers[0].name)?.key).toBe("kycklingfile");
  });
});
