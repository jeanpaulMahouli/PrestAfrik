import { describe, expect, it } from "vitest";
import { isPassthroughPath, storeHref, storeRewritePath, storeSlugFromHost } from "@/lib/store-host";

describe("storeSlugFromHost", () => {
  it("lit l'adresse de la boutique dans le sous-domaine", () => {
    expect(storeSlugFromHost("mboa-style.prestafrik.com", "prestafrik.com")).toBe("mboa-style");
    expect(storeSlugFromHost("Mboa-Style.PrestAfrik.com.", "prestafrik.com")).toBe("mboa-style");
    expect(storeSlugFromHost("mboa.localhost:3001", "localhost:3001")).toBe("mboa");
  });

  it("ignore le domaine principal, les sous-domaines réservés et les autres hôtes", () => {
    expect(storeSlugFromHost("prestafrik.com", "prestafrik.com")).toBeNull();
    expect(storeSlugFromHost("www.prestafrik.com", "prestafrik.com")).toBeNull();
    expect(storeSlugFromHost("a.b.prestafrik.com", "prestafrik.com")).toBeNull();
    expect(storeSlugFromHost("mboa.evil-prestafrik.com", "prestafrik.com")).toBeNull();
    expect(storeSlugFromHost("mboa.prestafrik.com.evil.io", "prestafrik.com")).toBeNull();
    expect(storeSlugFromHost("-x-.prestafrik.com", "prestafrik.com")).toBeNull();
    expect(storeSlugFromHost("mboa.prestafrik.com", undefined)).toBeNull();
  });
});

describe("chemins", () => {
  it("réécrit les pages vers la boutique et laisse passer les fichiers", () => {
    expect(storeRewritePath("mboa", "/")).toBe("/mboa");
    expect(storeRewritePath("mboa", "/panier")).toBe("/mboa/panier");
    expect(isPassthroughPath("/_next/static/chunk.js")).toBe(true);
    expect(isPassthroughPath("/api/boutique/mboa/icone")).toBe(true);
    expect(isPassthroughPath("/landing/logo.webp")).toBe(true);
    expect(isPassthroughPath("/robe-wax")).toBe(false);
    expect(isPassthroughPath("/apiculture")).toBe(false);
  });

  it("construit les liens selon le domaine", () => {
    expect(storeHref("")).toBe("/");
    expect(storeHref("", "panier")).toBe("/panier");
    expect(storeHref("", "suivi", "abc")).toBe("/suivi/abc");
    expect(storeHref("/mboa")).toBe("/mboa");
    expect(storeHref("/mboa", "page", "contact")).toBe("/mboa/page/contact");
  });
});
