import { currentTemplate, defaultCustomerTemplate, defaultStoreTemplate, renderTemplate } from "../src/modules/whatsapp/templates";
import { describe, expect, it } from "vitest";
import {
  buildProductWhatsappOrderMessage,
  buildWaMeUrl,
  formatWhatsappNumber,
  normalizeWhatsappNumber,
} from "../src/modules/whatsapp/wa-me";

const order = {
  storeName: "Mboa Style",
  customerName: "Estelle Nkoa",
  reference: "MB-1042",
  items: [
    { productName: "Robe wax", variantName: "M", quantity: 2 },
    { productName: "Sac raphia", variantName: null, quantity: 1 },
  ],
  totalXaf: 27500,
  deliveryMethod: "DELIVERY",
  city: "Douala",
  neighborhood: "Bonamoussadi",
  landmark: "Près de la pharmacie",
};

describe("numéros WhatsApp", () => {
  it("normalise un numéro camerounais avec ou sans indicatif", () => {
    expect(normalizeWhatsappNumber("699 00 00 00")).toBe("+237699000000");
    expect(normalizeWhatsappNumber("+237 6 99 00 00 00")).toBe("+237699000000");
    expect(normalizeWhatsappNumber("00237699000000")).toBe("+237699000000");
    expect(normalizeWhatsappNumber("+225 07 01 02 03 04")).toBe("+2250701020304");
  });

  it("refuse les numéros invalides", () => {
    expect(normalizeWhatsappNumber("")).toBeNull();
    expect(normalizeWhatsappNumber("+237 12345")).toBeNull();
    expect(normalizeWhatsappNumber("+237 1 99 00 00 00")).toBeNull();
    expect(normalizeWhatsappNumber("appelle-moi")).toBeNull();
  });

  it("formate un numéro camerounais pour l’affichage", () => {
    expect(formatWhatsappNumber("+237699000000")).toBe("+237 6 99 00 00 00");
  });
});

describe("liens wa.me", () => {
  it("construit un lien avec le texte encodé", () => {
    const url = new URL(buildWaMeUrl("+237699000000", "Bonjour & merci ?"));
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toBe("/237699000000");
    expect(url.searchParams.get("text")).toBe("Bonjour & merci ?");
  });

  it("omet le texte quand il est absent", () => {
    expect(buildWaMeUrl("+237699000000")).toBe("https://wa.me/237699000000");
  });

  it("prépare la commande d’un produit avec variante, quantité et lien", () => {
    const message = buildProductWhatsappOrderMessage({
      storeName: "Mboa Style",
      productName: "Robe wax",
      variantLabel: "Taille : M",
      quantity: 2,
      unitPriceXaf: 12500,
      productUrl: "https://prestafrik.example/boutique/mboa-style/robe-wax",
    });
    expect(message).toContain("Robe wax (Taille : M) × 2");
    expect(message).toContain("Total produits : 25 000 FCFA");
    expect(message).toContain("https://prestafrik.example/boutique/mboa-style/robe-wax");
  });

  it("prépare le message « Continuer sur WhatsApp » sans demande de confirmation", () => {
    const message = renderTemplate(defaultStoreTemplate, order);
    expect(message).toContain("Bonjour Estelle, merci pour votre commande #MB-1042 chez Mboa Style !");
    expect(message).toContain("Robe wax (M) × 2, Sac raphia × 1");
    expect(message).toContain("Livraison : Douala, Bonamoussadi, Près de la pharmacie.");
    expect(message).not.toMatch(/confirm/i);
  });

  it("remplace les anciens messages par défaut qui demandaient une confirmation", () => {
    const legacy = "Bonjour {boutique}, je confirme ma commande {reference} : {articles}. Montant : {montant}. Livraison : {livraison}.";
    expect(currentTemplate(legacy, defaultCustomerTemplate)).toBe(defaultCustomerTemplate);
    expect(currentTemplate("Mon message perso", defaultCustomerTemplate)).toBe("Mon message perso");
    expect(currentTemplate(null, defaultStoreTemplate)).toBe(defaultStoreTemplate);
  });
});
