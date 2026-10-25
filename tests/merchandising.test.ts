import { describe, expect, it } from "vitest";
import { discountPercent } from "@/modules/catalog/format";
import { storeLinkHref, storeLinkSchema } from "@/modules/merchandising/links";
import { bannerFieldsSchema, dayInputValue, popupFieldsSchema } from "@/modules/merchandising/validation";

describe("réduction affichée sur les cartes", () => {
  it("arrondit à l'entier et ignore les fausses promotions", () => {
    expect(discountPercent({ priceXaf: 10000, promotionalPriceXaf: 8500 })).toBe(15);
    expect(discountPercent({ priceXaf: 15000, promotionalPriceXaf: 11300 })).toBe(25);
    expect(discountPercent({ priceXaf: 10000, promotionalPriceXaf: null })).toBe(0);
    expect(discountPercent({ priceXaf: 10000, promotionalPriceXaf: 10000 })).toBe(0);
    expect(discountPercent({ priceXaf: 10000, promotionalPriceXaf: 12000 })).toBe(0);
  });
});

describe("lien au clic d'une bannière ou d'un popup", () => {
  const link = (linkType: "NONE" | "CATEGORY" | "PRODUCT" | "PROMO", extra: object = {}) => ({ linkType, category: null, product: null, ...extra });

  it("mène à la catégorie, au produit ou aux promotions, sur le domaine principal et en sous-domaine", () => {
    expect(storeLinkHref(link("CATEGORY", { category: { slug: "robes" } }), "/mboa-style")).toBe("/mboa-style?categorie=robes");
    expect(storeLinkHref(link("PRODUCT", { product: { slug: "robe-wax", status: "ACTIVE" } }), "/mboa-style")).toBe("/mboa-style/robe-wax");
    expect(storeLinkHref(link("PROMO"), "/mboa-style")).toBe("/mboa-style/promotions");
    expect(storeLinkHref(link("PROMO"), "")).toBe("/promotions");
    expect(storeLinkHref(link("CATEGORY", { category: { slug: "robes" } }), "")).toBe("/?categorie=robes");
  });

  it("rend l'image non cliquable sans lien, ou si la cible a disparu", () => {
    expect(storeLinkHref(link("NONE"), "/b")).toBeNull();
    expect(storeLinkHref(link("CATEGORY"), "/b")).toBeNull();
    expect(storeLinkHref(link("PRODUCT", { product: { slug: "x", status: "ARCHIVED" } }), "/b")).toBeNull();
  });

  it("exige la catégorie ou le produit choisi, et ne garde que le champ utile", () => {
    expect(storeLinkSchema.safeParse({ linkType: "CATEGORY" }).success).toBe(false);
    expect(storeLinkSchema.safeParse({ linkType: "PRODUCT", productId: "" }).success).toBe(false);
    expect(storeLinkSchema.parse({ linkType: "PROMO", categoryId: "c1", productId: "p1" })).toEqual({ linkType: "PROMO", categoryId: null, productId: null });
    expect(storeLinkSchema.parse({ linkType: "CATEGORY", categoryId: "c1", productId: "p1" })).toEqual({ linkType: "CATEGORY", categoryId: "c1", productId: null });
    expect(storeLinkSchema.safeParse({ linkType: "AUTRE" }).success).toBe(false);
  });
});

describe("formulaires de la bannière et des popups", () => {
  it("limite la description de l'image", () => {
    expect(bannerFieldsSchema.safeParse({ altText: "x".repeat(201), linkType: "NONE" }).success).toBe(false);
    expect(bannerFieldsSchema.safeParse({ altText: "", linkType: "NONE" }).success).toBe(true);
  });

  it("lit les jours à l'heure de Douala et refuse une fin avant le début", () => {
    const popup = popupFieldsSchema.parse({ title: "Soldes", altText: "", isActive: true, startsAt: "2026-11-01", endsAt: "2026-11-01", linkType: "NONE" });
    expect(popup.startsAt?.toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(popup.endsAt?.toISOString()).toBe("2026-11-01T22:59:59.000Z");
    expect(dayInputValue(popup.startsAt)).toBe("2026-11-01");
    expect(dayInputValue(popup.endsAt)).toBe("2026-11-01");
    const reversed = popupFieldsSchema.safeParse({ title: "Soldes", altText: "", isActive: true, startsAt: "2026-11-05", endsAt: "2026-11-01", linkType: "NONE" });
    expect(reversed.success).toBe(false);
    expect(popupFieldsSchema.safeParse({ title: "S", altText: "", isActive: false, linkType: "NONE" }).success).toBe(false);
  });
});
