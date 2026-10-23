import { describe, expect, it } from "vitest";
import { matchIngredient } from "../matching";
import { extractKey, parseCoopPromotions, parseCoopStores } from "../providers/coop";
import { extractInitialData, icaSlug, parseIcaOffers, parseIcaStores } from "../providers/ica";
import type { Store } from "../types";

// These endpoints are undocumented. The shapes below follow what the sites
// were observed to return (fields the parsers rely on, trimmed).

const coopStore: Store = {
  id: "live:coop:252500",
  chain: "coop",
  chainStoreId: "252500",
  name: "Stora Coop Bäckebol",
  lat: 57.77,
  lng: 11.99,
  source: "live",
};

const icaStore: Store = {
  id: "live:ica:16622",
  chain: "ica",
  chainStoreId: "16622",
  name: "ICA Kvantum Trossen",
  lat: 59.3,
  lng: 18.0,
  source: "live",
};

describe("coop", () => {
  it("extracts API keys from the homepage settings", () => {
    const html = `<script>window.coopSettings = {"personalizationApiSubscriptionKey":"${"a".repeat(32)}","hybrisApiSubscriptionKey": "${"0123456789abcdef".repeat(2)}"};</script>`;
    expect(extractKey(html, "personalizationApiSubscriptionKey")).toBe("a".repeat(32));
    expect(extractKey(html, "hybrisApiSubscriptionKey")).toBe("0123456789abcdef".repeat(2));
    expect(extractKey("<html></html>", "hybrisApiSubscriptionKey")).toBeUndefined();
  });

  it("parses e-commerce stores keyed by ledger number", () => {
    const stores = parseCoopStores({
      pointOfServices: [
        {
          name: "252500",
          displayName: "Stora Coop Bäckebol",
          address: { line1: "Transportgatan 19", postalCode: "42246", town: "Hisings Backa" },
          geoPoint: { latitude: 57.7726, longitude: 11.9937 },
        },
        { name: "999999", displayName: "No location" },
      ],
    });
    expect(stores).toHaveLength(1);
    expect(stores[0]).toMatchObject({
      id: "live:coop:252500",
      chainStoreId: "252500",
      name: "Stora Coop Bäckebol",
      address: "Transportgatan 19, Hisings Backa",
      lat: 57.7726,
    });
  });

  it("parses promotions: piece, multi-buy, member price and weighed goods", () => {
    const offers = parseCoopPromotions(
      {
        results: {
          count: 4,
          items: [
            {
              id: "1",
              ean: "7300156581006",
              name: "Kycklingfilé Fryst",
              manufacturerName: "Kronfågel",
              salesUnit: "Styck",
              packageSize: 1000,
              packageSizeUnit: "gram",
              piecePriceData: { b2cPrice: 129 },
              comparativePriceData: { b2cPrice: 129 },
              comparativePriceUnit: { unit: "kg" },
              onlinePromotions: [{ priceData: { b2cPrice: 89 }, comparativePrice: { b2cPrice: 89 }, numberOfProductRequired: 1 }],
            },
            {
              id: "2",
              name: "Krossade Tomater",
              salesUnit: "Styck",
              packageSize: 400,
              packageSizeUnit: "gram",
              piecePriceData: { b2cPrice: 14.9 },
              comparativePriceUnit: { unit: "kg" },
              onlinePromotions: [{ message: "2 för 20 kr", priceData: { b2cPrice: 20 }, numberOfProductRequired: 2 }],
            },
            {
              id: "3",
              name: "Matlagningsgrädde 15%",
              salesUnit: "Styck",
              packageSize: 5,
              packageSizeUnit: "deciliter",
              piecePriceData: { b2cPrice: 22 },
              comparativePriceUnit: { unit: "liter" },
              onlinePromotions: [{ priceData: { b2cPrice: 15 }, comparativePrice: { b2cPrice: 30 }, medMeraRequired: true }],
            },
            {
              id: "4",
              name: "Gul Lök",
              salesUnit: "Vikt",
              salesPriceData: { b2cPrice: 19.9 },
              onlinePromotions: [{ priceData: { b2cPrice: 12.9 }, comparativePrice: { b2cPrice: 12.9 } }],
            },
            { id: "5", name: "Not on offer", piecePriceData: { b2cPrice: 10 }, onlinePromotions: [] },
          ],
        },
      },
      coopStore,
    );

    expect(offers).toHaveLength(4);
    expect(offers[0]).toMatchObject({ price: 89, unitPrice: 89, unit: "kg", packageSize: "1000 g", regularPrice: 129, priceLabel: "89 kr" });
    expect(offers[1]).toMatchObject({ price: 10, priceLabel: "2 för 20 kr", packageSize: "400 g" });
    expect(offers[2]).toMatchObject({ price: 15, unit: "l", packageSize: "5 dl", priceLabel: "15 kr (medlemspris)" });
    expect(offers[3]).toMatchObject({ price: 12.9, unit: "kg", unitPrice: 12.9, packageSize: undefined, priceLabel: "12,9 kr/kg" });
    expect(matchIngredient(offers[0].name)?.key).toBe("kycklingfile");
  });

  it("returns nothing for unexpected shapes", () => {
    expect(parseCoopStores(null)).toEqual([]);
    expect(parseCoopPromotions({ results: {} }, coopStore)).toEqual([]);
  });
});

describe("ica", () => {
  it("builds offer page slugs from store name and id", () => {
    expect(icaSlug("ICA Supermarket Vagnhärad", "1004281")).toBe("ica-supermarket-vagnharad-1004281");
    expect(icaSlug("ICA Kvantum Trossen", "16622")).toBe("ica-kvantum-trossen-16622");
    expect(icaSlug("Maxi ICA Stormarknad Örebro Boglundsängen", "1003462")).toBe(
      "maxi-ica-stormarknad-orebro-boglundsangen-1003462",
    );
  });

  it("merges and de-duplicates stores from the postcode lookup", () => {
    const store = { id: "16622", accountId: "abc", name: "ICA Kvantum Trossen", street: "Trossvägen 1", zipCode: "12345", city: "Stockholm", latitude: 59.3, longitude: 18.0 };
    const stores = parseIcaStores({
      forHomeDelivery: [store],
      forPickupDelivery: [store, { id: "2", name: "No location" }],
      accountId: "ignored",
    });
    expect(stores).toHaveLength(1);
    expect(stores[0]).toMatchObject({ id: "live:ica:16622", chainStoreId: "16622", address: "Trossvägen 1, Stockholm" });
  });

  const OFFERS_PAGE = `<html><script>window.__INITIAL_DATA__ = {"offers":{"weeklyOffers":[
    {"id":"5004121223","details":{"brand":"ICA. Polen","packageInformation":"1 kg","name":"Äpplen i påse","mechanicInfo":"10 kr/st"},
     "validTo":"2026-10-18T00:00:00","comparisonPrice":"10:00/kg","restriction":"Max 1 köp/hushåll",
     "parsedMechanics":{"type":"Standard","benefitType":"FIXED","quantity":1,"value1":"","value2":"10","value3":"","value4":"/st"},
     "stores":[{"storeMarketingName":"ICA Kvantum Trossen","BMSStoreId":16622,"regularPrice":"15,90"}],"extra":undefined},
    {"id":"5004121224","details":{"brand":"Zeta","packageInformation":"80 g","name":"Salami Milano, Napoli","mechanicInfo":"2 för 35 kr"},
     "validTo":"2026-10-18T00:00:00","comparisonPrice":"218:75/kg","restriction":"",
     "parsedMechanics":{"type":"Standard","benefitType":"FIXED","quantity":2,"value1":"2 för","value2":"35","value3":"","value4":""},
     "stores":[{"regularPrice":"34,84"}]},
    {"id":"3","details":{"name":"Kycklingfilé","packageInformation":"ca 900 g","mechanicInfo":"99 kr/kg"},
     "comparisonPrice":"99:00/kg","parsedMechanics":{"benefitType":"FIXED","quantity":1,"value2":"99","value4":"/kg"}},
    {"id":"4","details":{"name":"Allt kaffe","mechanicInfo":"25%"},"parsedMechanics":{"benefitType":"PERCENT","value2":"25"}}
  ]},"cache":new Map([])};
  window.other = 1;</script></html>`;

  it("reads the offers embedded in the offers page", () => {
    const data = extractInitialData(OFFERS_PAGE);
    expect(data).toBeTruthy();
    const offers = parseIcaOffers(data, icaStore);
    expect(offers).toHaveLength(3);
    expect(offers[0]).toMatchObject({
      name: "Äpplen i påse",
      price: 10,
      unitPrice: 10,
      unit: "kg",
      packageSize: "1 kg",
      regularPrice: 15.9,
      priceLabel: "10 kr/st (Max 1 köp/hushåll)",
      validTo: "2026-10-18",
    });
    expect(offers[1]).toMatchObject({ price: 17.5, unitPrice: 218.75, unit: "kg", priceLabel: "2 för 35 kr" });
    // Sold by weight: no package, price per kg.
    expect(offers[2]).toMatchObject({ price: 99, unitPrice: 99, unit: "kg", packageSize: undefined });
    expect(matchIngredient(offers[2].name)?.key).toBe("kycklingfile");
  });

  it("returns undefined when the page has no embedded data", () => {
    expect(extractInitialData("<html>Access denied</html>")).toBeUndefined();
  });
});
