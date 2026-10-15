import { describe, expect, it } from "vitest";
import { getCities, getRegions, normalizeSearch } from "@/modules/geo";
import { checkSlug, slugify, slugSuggestions } from "@/modules/stores/slug";

describe("adresse de boutique", () => {
  it("transforme un nom en adresse valide", () => {
    expect(slugify("Mboa Style")).toBe("mboa-style");
    expect(slugify("  Épicerie d’Akwa !! ")).toBe("epicerie-d-akwa");
    expect(slugify("a".repeat(60))).toHaveLength(40);
  });

  it("refuse les formats invalides et les noms réservés", () => {
    expect(checkSlug("mboa-style")).toBeNull();
    expect(checkSlug("ab")).toBe("format");
    expect(checkSlug("-mboa")).toBe("format");
    expect(checkSlug("mboa-")).toBe("format");
    expect(checkSlug("Mboa")).toBe("format");
    expect(checkSlug("mboa--style")).toBe("format");
    expect(checkSlug("admin")).toBe("reserved");
    expect(checkSlug("boutique")).toBe("reserved");
  });

  it("propose des adresses valides et différentes", () => {
    const suggestions = slugSuggestions("Mboa Style", "Douala");
    expect(suggestions).toContain("mboa-style-douala");
    expect(suggestions).not.toContain("mboa-style");
    for (const suggestion of suggestions) expect(checkSlug(suggestion)).toBeNull();
  });
});

describe("listes géographiques", () => {
  it("contient les 10 régions du Cameroun", () => {
    expect(getRegions("CM")).toHaveLength(10);
    expect(getRegions("CM", "extreme").map((region) => region.name)).toEqual(["Extrême-Nord"]);
  });

  it("filtre les villes sans tenir compte des accents", () => {
    expect(getCities("CM", "LT", "edea")).toEqual(["Edéa"]);
    expect(getCities("CM", "CE")).toContain("Yaoundé");
    expect(normalizeSearch("Ngaoundéré")).toBe("ngaoundere");
    expect(getRegions("SN")).toEqual([]);
  });
});
