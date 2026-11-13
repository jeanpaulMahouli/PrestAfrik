import { describe, expect, it } from "vitest";
import { normalizeSocialUrl } from "../src/modules/stores/social-links";

describe("liens des réseaux sociaux", () => {
  it("complète les liens et les identifiants", () => {
    expect(normalizeSocialUrl("facebookUrl", "facebook.com/maboutique")).toEqual({ ok: true, url: "https://facebook.com/maboutique" });
    expect(normalizeSocialUrl("instagramUrl", "@ma.boutique")).toEqual({ ok: true, url: "https://www.instagram.com/ma.boutique" });
    expect(normalizeSocialUrl("tiktokUrl", "maboutique")).toEqual({ ok: true, url: "https://www.tiktok.com/@maboutique" });
    expect(normalizeSocialUrl("youtubeUrl", "http://m.youtube.com/@chaine")).toEqual({ ok: true, url: "https://m.youtube.com/@chaine" });
    expect(normalizeSocialUrl("xUrl", "")).toEqual({ ok: true, url: null });
  });

  it("refuse un lien d'un autre site", () => {
    expect(normalizeSocialUrl("facebookUrl", "https://exemple.com/page").ok).toBe(false);
    expect(normalizeSocialUrl("instagramUrl", "https://facebook.com/x").ok).toBe(false);
    expect(normalizeSocialUrl("xUrl", "javascript:alert(1)").ok).toBe(false);
  });
});
