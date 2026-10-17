import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { draftMissing, normalizeStoreName } = await import("@/modules/stores/draft");
const { checkSlug } = await import("@/modules/stores/slug");
const { storePath } = await import("@/lib/urls");

describe("boutique en cours de création", () => {
  it("compare les noms sans tenir compte de la casse, des accents ni des espaces", () => {
    expect(normalizeStoreName("  Mboa   Style ")).toBe(normalizeStoreName("mboa style"));
    expect(normalizeStoreName("Épicerie d’Akwa")).toBe(normalizeStoreName("epicerie d’akwa"));
    expect(normalizeStoreName("Mboa Style")).not.toBe(normalizeStoreName("Mboa Style Douala"));
  });

  it("liste ce qui manque avant de créer la boutique, avec l'étape à compléter", () => {
    expect(draftMissing({}).map((item) => item.step)).toEqual([1, 2, 3, 4]);
    expect(
      draftMissing({
        name: "Mboa Style",
        slug: "mboa-style",
        activityOther: "Vente de pagnes",
        city: "Douala",
        phone: { country: "CM", national: "699000000", e164: "+237699000000" },
      }),
    ).toEqual([]);
  });
});

describe("adresse de boutique à la racine du site", () => {
  it("construit les chemins prestafrik.com/{adresse}", () => {
    expect(storePath("mboa-style")).toBe("/mboa-style");
    expect(storePath("mboa-style", "panier")).toBe("/mboa-style/panier");
  });

  it("refuse les adresses qui entreraient en conflit avec les pages du site", () => {
    for (const slug of ["dashboard", "connexion", "inscription", "boutiques", "legal", "media", "invitations", "mot-de-passe-oublie", "reinitialiser"]) {
      expect(checkSlug(slug)).toBe("reserved");
    }
    expect(checkSlug("mboa-style")).toBeNull();
  });
});
