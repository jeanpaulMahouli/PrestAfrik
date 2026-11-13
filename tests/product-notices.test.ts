import { describe, expect, it } from "vitest";
import { buildProductNotices, cleanAmountInput, discountPercent, productCompletion, type ProductSnapshot } from "../src/modules/catalog/product-notices";
import { productFormSchema } from "../src/modules/catalog/validation";

const base: ProductSnapshot = {
  name: "Robe wax Akwa",
  description: "Belle robe en wax.",
  categoryChosen: true,
  priceXaf: "15000",
  promotionalPriceXaf: "12000",
  trackInventory: false,
  stockQuantity: "",
  availability: "AVAILABLE",
  photoCount: 3,
  uploading: false,
};

const ids = (snapshot: Partial<ProductSnapshot>) =>
  buildProductNotices({ ...base, ...snapshot }).map((notice) => notice.id);

describe("infos pratiques du formulaire produit", () => {
  it("ne signale rien pour une fiche complète", () => {
    expect(ids({})).toEqual([]);
  });

  it("refuse un prix à 0 ou vide, et signale un prix très bas", () => {
    expect(ids({ priceXaf: "0", promotionalPriceXaf: "" })).toContain("price-zero");
    expect(ids({ priceXaf: "" })).toContain("price-missing");
    expect(ids({ priceXaf: "15 000" })).toContain("price-format");
    expect(ids({ priceXaf: "50", promotionalPriceXaf: "" })).toContain("price-low");
  });

  it("contrôle le prix promotionnel et suggère une promotion", () => {
    expect(ids({ promotionalPriceXaf: "15000" })).toContain("promo-high");
    expect(ids({ promotionalPriceXaf: "0" })).toContain("promo-zero");
    expect(ids({ promotionalPriceXaf: "1000" })).toContain("promo-deep");
    expect(ids({ promotionalPriceXaf: "" })).toContain("promo-suggest");
  });

  it("signale catégorie, photos, description et stock", () => {
    expect(ids({ categoryChosen: false })).toContain("category");
    expect(ids({ photoCount: 0 })).toContain("photos-none");
    expect(ids({ photoCount: 1 })).toContain("photos-one");
    expect(ids({ photoCount: 0, uploading: true })).not.toContain("photos-none");
    expect(ids({ description: " " })).toContain("description");
    expect(ids({ trackInventory: true, stockQuantity: "0" })).toContain("stock-zero");
    expect(ids({ name: "ROBE WAX AKWA" })).toContain("name-caps");
  });

  it("classe les alertes bloquantes en premier", () => {
    const levels = buildProductNotices({ ...base, priceXaf: "0", promotionalPriceXaf: "", categoryChosen: false, photoCount: 1 }).map((notice) => notice.level);
    expect(levels).toEqual([...levels].sort((a, b) => ["danger", "warning", "tip"].indexOf(a) - ["danger", "warning", "tip"].indexOf(b)));
    expect(levels[0]).toBe("danger");
  });
});

describe("validation serveur du prix", () => {
  const form = {
    name: "Robe wax",
    description: "",
    categoryId: "",
    newCategory: "",
    priceXaf: "15000",
    promotionalPriceXaf: "",
    sku: "",
    availability: "AVAILABLE",
    trackInventory: false,
    stockQuantity: "",
    status: "ACTIVE",
    isFeatured: false,
  };

  it("refuse un prix ou un prix promotionnel à 0 FCFA", () => {
    expect(productFormSchema.safeParse(form).success).toBe(true);
    expect(productFormSchema.safeParse({ ...form, priceXaf: "0" }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...form, promotionalPriceXaf: "0" }).success).toBe(false);
  });
});

describe("avancement et saisie du prix", () => {
  it("calcule l'avancement de la fiche", () => {
    expect(productCompletion(base).percent).toBe(100);
    const empty = productCompletion({ ...base, name: "", description: "", categoryChosen: false, priceXaf: "0", photoCount: 0 });
    expect(empty.percent).toBe(0);
    expect(productCompletion({ ...base, categoryChosen: false }).steps.find((step) => step.id === "category")?.done).toBe(false);
  });

  it("nettoie le montant saisi", () => {
    expect(cleanAmountInput("15 000 FCFA")).toBe("15000");
    expect(cleanAmountInput("15.000")).toBe("15000");
    expect(cleanAmountInput("007")).toBe("7");
    expect(cleanAmountInput("0")).toBe("0");
  });

  it("calcule la réduction affichée", () => {
    expect(discountPercent("15000", "12000")).toBe(20);
    expect(discountPercent("15000", "15000")).toBeNull();
    expect(discountPercent("15000", "")).toBeNull();
  });
});
