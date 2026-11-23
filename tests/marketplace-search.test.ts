import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { normalizeForSearch, parseSearchQuery, relevanceScore } = await import("@/modules/marketplace/search");

const store = (name: string, city: string, activity = "", description = "") => ({
  id: name,
  name,
  slug: name.toLowerCase(),
  city,
  country: "CM",
  activity,
  activitySlug: null,
  description,
  logoUrl: null,
  createdAt: new Date(),
  haystack: { name: normalizeForSearch(name), city: normalizeForSearch(`${city} Cameroun`), activity: normalizeForSearch(activity), description: normalizeForSearch(description) },
});

describe("recherche de vendeurs", () => {
  it("ignore les accents et les majuscules", () => {
    expect(normalizeForSearch("Yaoundé Beauté")).toBe("yaounde beaute");
    expect(relevanceScore(store("Ma Boutique", "Yaoundé"), ["yaounde"])).toBeGreaterThan(0);
  });

  it("classe le nom avant la ville, l'activité et la description", () => {
    const terms = ["pagne"];
    const byName = relevanceScore(store("Pagne Royal", "Douala"), terms);
    const byActivity = relevanceScore(store("Chez Awa", "Douala", "Pagne et tissus"), terms);
    const byDescription = relevanceScore(store("Chez Ngo", "Douala", "", "Vente de pagne"), terms);
    expect(byName).toBeGreaterThan(byActivity);
    expect(byActivity).toBeGreaterThan(byDescription);
  });

  it("exige chaque mot de la requête", () => {
    expect(relevanceScore(store("Mboa Style", "Douala"), ["mboa", "yaounde"])).toBe(0);
    expect(relevanceScore(store("Mboa Style", "Douala"), ["mboa", "douala"])).toBeGreaterThan(0);
  });

  it("valide la requête : 2 à 60 caractères, sans balises ni caractères de contrôle", () => {
    expect(parseSearchQuery("a")).toBeNull();
    expect(parseSearchQuery("x".repeat(61))).toBeNull();
    expect(parseSearchQuery("  <script>pagne\u0000  ")).toBe("script pagne");
    expect(parseSearchQuery(undefined)).toBeNull();
  });
});
