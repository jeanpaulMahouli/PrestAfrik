import { describe, expect, it } from "vitest";
import { priceSuffix, propertyFacts, readListingForm, storedPropertyDetails } from "../src/modules/catalog/listing";

const form = (values: Record<string, string>, checked: string[] = [], mode: "rent" | "sale" = values.listingType === "SALE" ? "sale" : "rent") =>
  readListingForm((key) => values[key] ?? "", (key) => checked.includes(key), mode);

describe("annonces immobilières", () => {
  it("accepte une location avec sa période et ses caractéristiques", () => {
    const parsed = form({ listingType: "RENT", pricePeriod: "MONTH", propertyType: "Appartement", surfaceM2: "85", bedrooms: "2", bathrooms: "1", neighborhood: "Bonamoussadi" }, ["furnished"]);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.pricePeriod).toBe("MONTH");
    expect(parsed.data.details).toMatchObject({ surfaceM2: 85, bedrooms: 2, furnished: true });
  });

  it("exige la période d'une location, l'ignore pour une vente", () => {
    expect(form({ listingType: "RENT", propertyType: "Studio" }).success).toBe(false);
    const sale = form({ listingType: "SALE", pricePeriod: "MONTH", propertyType: "Terrain" });
    expect(sale.success && sale.data.pricePeriod).toBeNull();
  });

  it("refuse un type de bien manquant, impose vente ou location selon l'activité", () => {
    expect(form({ listingType: "SALE" }).success).toBe(false);
    const forced = form({ listingType: "SALE", pricePeriod: "DAY", propertyType: "Studio" }, [], "rent");
    expect(forced.success && forced.data.listingType).toBe("RENT");
  });

  it("affiche le suffixe du loyer et les caractéristiques", () => {
    expect(priceSuffix("RENT", "MONTH")).toBe("/ mois");
    expect(priceSuffix("SALE", "MONTH")).toBe("");
    const details = storedPropertyDetails({ propertyType: "Terrain", surfaceM2: 500, bedrooms: null, bathrooms: null, furnished: false, neighborhood: "" });
    expect(propertyFacts(details).map((fact) => fact.key)).toEqual(["type", "surface"]);
    expect(storedPropertyDetails({ propertyType: "Château" })).toBeNull();
  });
});
