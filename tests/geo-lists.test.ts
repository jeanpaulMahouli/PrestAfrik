import { describe, expect, it } from "vitest";
import { countryCities, getCities, getRegions, isKnownCity, supportedCountries } from "@/modules/geo";

describe("listes de pays et de villes (aucune saisie libre)", () => {
  it("propose les 14 pays du franc CFA, chacun avec ses régions et ses villes", () => {
    expect([...supportedCountries].sort()).toEqual(["BF", "BJ", "CF", "CG", "CI", "CM", "GA", "GQ", "GW", "ML", "NE", "SN", "TD", "TG"]);
    for (const iso of supportedCountries) {
      const regions = getRegions(iso);
      expect(regions.length).toBeGreaterThan(0);
      expect(new Set(regions.map((region) => region.code)).size).toBe(regions.length);
      expect(regions.every((region) => region.cities.length > 0)).toBe(true);
    }
  });

  it("filtre les villes selon le pays choisi", () => {
    expect(isKnownCity("GA", "Libreville")).toBe(true);
    expect(isKnownCity("CM", "Libreville")).toBe(false);
    expect(isKnownCity("SN", "Dakar")).toBe(true);
    expect(countryCities("CI")).toContain("Abidjan");
    expect(countryCities("CI")).not.toContain("Douala");
  });

  it("reconnaît les villes de la liste et refuse les autres", () => {
    expect(isKnownCity("CM", "Douala")).toBe(true);
    expect(isKnownCity("CM", "Yaoundé")).toBe(true);
    expect(isKnownCity("CM", "Ville inventée")).toBe(false);
    expect(isKnownCity("FR", "Paris")).toBe(false); // hors zone FCFA
  });

  it("liste toutes les villes d’un pays, triées et sans doublon, cohérentes avec les régions", () => {
    const cities = countryCities("CM");
    expect(new Set(cities).size).toBe(cities.length);
    expect([...cities].sort((a, b) => a.localeCompare(b, "fr"))).toEqual(cities);
    const littoral = getRegions("CM").find((region) => region.name === "Littoral");
    expect(littoral && getCities("CM", littoral.code)).toContain("Douala");
  });
});
