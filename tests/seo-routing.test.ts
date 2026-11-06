import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isSellerFunnelHref, readAttribution, withAttribution } from "@/lib/attribution";
import { proxy } from "@/proxy";

// Étape 0 du référencement : la marketplace devient l'accueil de prestafrik.com, shop.prestafrik.com
// redirige en 301 adresse par adresse, les boutiques et l'espace connecté restent hors de Google.

const request = (url: string, method = "GET") => new NextRequest(new URL(url), { method });

describe("proxy : adresses de la marketplace", () => {
  beforeEach(() => {
    vi.stubEnv("FEATURE_SUBDOMAINS", "true");
    vi.stubEnv("STORE_ROOT_DOMAIN", "prestafrik.com");
    vi.stubEnv("BETTER_AUTH_URL", "https://prestafrik.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("redirige chaque adresse de shop.prestafrik.com vers la même page de prestafrik.com, en 301 et en une étape", () => {
    const cases = [
      ["https://shop.prestafrik.com/", "https://prestafrik.com/"],
      ["https://shop.prestafrik.com/recherche?categorie=vetements-mode", "https://prestafrik.com/recherche?categorie=vetements-mode"],
      ["https://shop.prestafrik.com/recherche?q=robe&tri=promo&utm_source=facebook", "https://prestafrik.com/recherche?q=robe&tri=promo&utm_source=facebook"],
      ["https://shop.prestafrik.com/robots.txt", "https://prestafrik.com/robots.txt"],
    ];
    for (const [from, to] of cases) {
      const response = proxy(request(from));
      expect(response.status, from).toBe(301);
      expect(response.headers.get("location"), from).toBe(to);
    }
  });

  it("garde le corps des envois (formulaires) avec une redirection 308", () => {
    expect(proxy(request("https://shop.prestafrik.com/recherche", "POST")).status).toBe(308);
  });

  it("redirige l'ancienne adresse interne /nos-boutiques vers la page publique", () => {
    const response = proxy(request("https://prestafrik.com/nos-boutiques/recherche?q=robe"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://prestafrik.com/recherche?q=robe");
  });

  it("sert la marketplace à l'accueil et à /recherche de prestafrik.com", () => {
    expect(proxy(request("https://prestafrik.com/")).headers.get("x-middleware-rewrite")).toBe("https://prestafrik.com/nos-boutiques");
    expect(proxy(request("https://prestafrik.com/recherche?q=robe")).headers.get("x-middleware-rewrite")).toBe("https://prestafrik.com/nos-boutiques/recherche?q=robe");
  });

  it("laisse la page « Devenir vendeur » /boutique et les pages du site à leur place", () => {
    expect(proxy(request("https://prestafrik.com/boutique")).headers.get("x-middleware-rewrite")).toBeNull();
    expect(proxy(request("https://prestafrik.com/a-propos")).headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("garde les boutiques et l'espace connecté hors des résultats de recherche", () => {
    const store = proxy(request("https://golden-needle.prestafrik.com/"));
    expect(store.headers.get("x-middleware-rewrite")).toBe("https://golden-needle.prestafrik.com/golden-needle");
    expect(store.headers.get("x-robots-tag")).toBe("noindex, follow");
    expect(proxy(request("https://app.prestafrik.com/connexion")).headers.get("x-robots-tag")).toBe("noindex, follow");
    expect(proxy(request("https://prestafrik.com/")).headers.get("x-robots-tag")).toBeNull();
  });
});

describe("suivi des publicités", () => {
  it("lit les paramètres de campagne et ignore les autres", () => {
    expect(readAttribution("?utm_source=facebook&utm_campaign=lancement&fbclid=abc&q=robe")).toEqual({ utm_source: "facebook", utm_campaign: "lancement", fbclid: "abc" });
    expect(readAttribution("?q=robe")).toEqual({});
  });

  it("ajoute les paramètres au lien « Devenir vendeur » sans écraser ceux qu'il porte", () => {
    expect(withAttribution("/boutique", { utm_source: "tiktok", ttclid: "x1" })).toBe("/boutique?utm_source=tiktok&ttclid=x1");
    expect(withAttribution("/inscription?utm_source=facebook", { utm_source: "tiktok" })).toBe("/inscription?utm_source=facebook");
    expect(withAttribution("https://prestafrik.com/boutique", { gclid: "g" })).toBe("https://prestafrik.com/boutique?gclid=g");
    expect(withAttribution("/boutique", {})).toBe("/boutique");
  });

  it("reconnaît les liens du parcours vendeur", () => {
    expect(isSellerFunnelHref("/boutique")).toBe(true);
    expect(isSellerFunnelHref("https://prestafrik.com/inscription?x=1")).toBe(true);
    expect(isSellerFunnelHref("/boutique/mboa-style")).toBe(false);
    expect(isSellerFunnelHref("/recherche")).toBe(false);
  });
});
