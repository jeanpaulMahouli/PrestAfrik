import { describe, expect, it } from "vitest";
import { countryCities, getCities, getRegions, isKnownCity, supportedCountries } from "@/modules/geo";

describe("listes de pays et de villes (aucune saisie libre)", () => {
  it("ne propose que les pays dont la liste des villes existe", () => {
    expect(supportedCountries).toEqual(["CM"]);
  });

  it("reconnaît les villes de la liste et refuse les autres", () => {
    expect(isKnownCity("CM", "Douala")).toBe(true);
    expect(isKnownCity("CM", "Yaoundé")).toBe(true);
    expect(isKnownCity("CM", "Ville inventée")).toBe(false);
    expect(isKnownCity("FR", "Paris")).toBe(false);
  });

  it("liste toutes les villes d’un pays, triées et sans doublon, cohérentes avec les régions", () => {
    const cities = countryCities("CM");
    expect(new Set(cities).size).toBe(cities.length);
    expect([...cities].sort((a, b) => a.localeCompare(b, "fr"))).toEqual(cities);
    const littoral = getRegions("CM").find((region) => region.name === "Littoral");
    expect(littoral && getCities("CM", littoral.code)).toContain("Douala");
  });
});
