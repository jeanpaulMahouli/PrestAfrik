import { describe, expect, it } from "vitest";
import { usesBrandName, usesBrandSlug } from "../src/modules/stores/brand";

describe("PrestAfrik brand is reserved", () => {
  it("catches the brand name however it is written", () => {
    for (const name of ["PrestAfrik", "prestafrik", "Presta Frik Shop", "PRESTA-AFRIK".replace("-A", ""), "Boutique Prest'Afrik", "PrèstAfrik officiel"]) {
      expect(usesBrandName(name), name).toBe(true);
    }
  });

  it("leaves ordinary shop names alone", () => {
    for (const name of ["Prestige Afrique", "Afrik Style", "Mboa Style", "Presto Pizza"]) {
      expect(usesBrandName(name), name).toBe(false);
    }
  });

  it("catches addresses containing the brand", () => {
    expect(usesBrandSlug("prestafrik")).toBe(true);
    expect(usesBrandSlug("presta-frik-officiel")).toBe(true);
    expect(usesBrandSlug("ma-boutique")).toBe(false);
  });
});
