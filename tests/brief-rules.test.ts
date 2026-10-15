import { describe, expect, it } from "vitest";
import { checkPassword, passwordStrength } from "../src/modules/auth/password-policy";
import { parsePhone, splitE164 } from "../src/lib/phone";
import { renderTemplate, unknownVariables } from "../src/modules/whatsapp/templates";
import { colorReadability, contrastRatio } from "../src/lib/contrast";
import { analyzeProductCsv } from "../src/modules/catalog/import";
import { safeCsvCell } from "../src/modules/catalog/validation";
import { blocksSchema } from "../src/modules/pages/blocks";
import { fillChatTemplate } from "../src/modules/chat/config";
import { resolvePeriod } from "../src/lib/periods";

describe("politique de mot de passe (brief §6.1)", () => {
  it("refuse 7 caractères et accepte 8", () => {
    expect(checkPassword("abcdefg")).toBe("tooShort");
    expect(checkPassword("abcdefgh2")).toBeNull();
  });
  it("refuse les mots de passe courants et ceux qui reprennent l’e-mail", () => {
    expect(checkPassword("password123")).toBe("tooCommon");
    expect(checkPassword("awangono1", { email: "awangono@example.test" })).toBe("tooCommon");
  });
  it("donne un indicateur consultatif", () => {
    expect(passwordStrength("abc")).toBe(0);
    expect(passwordStrength("Boutique-2026!Douala")).toBe(4);
  });
});

describe("téléphones (brief §6.3)", () => {
  it("valide un numéro camerounais et produit l’E.164", () => {
    expect(parsePhone("CM", "6 99 00 00 00")).toEqual({ ok: true, country: "CM", national: "699000000", e164: "+237699000000" });
  });
  it("refuse un numéro invalide pour le pays", () => {
    const result = parsePhone("CM", "12345");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("+237");
  });
  it("relit un E.164 en deux champs", () => {
    expect(splitE164("+237699000000")).toEqual({ country: "CM", national: "699000000" });
  });
});

describe("modèles wa.me (brief §6.8)", () => {
  const order = {
    storeName: "Mboa Style",
    customerName: "Estelle Nkoa",
    reference: "MB-1042",
    items: Array.from({ length: 60 }, (_, index) => ({ productName: `Produit numéro ${index + 1} avec un nom long`, variantName: null, quantity: 1 })),
    totalXaf: null,
    deliveryMethod: "DELIVERY",
    city: "Douala",
    neighborhood: "Akwa",
    landmark: null,
  };
  it("remplace les variables avec le montant fixé", () => {
    const text = renderTemplate("Bonjour {prenom}, commande {reference}, {montant}, {livraison}", { ...order, totalXaf: 28500, items: order.items.slice(0, 1) });
    expect(text).toBe("Bonjour Estelle, commande #MB-1042, 28 500 FCFA, Douala, Akwa");
  });
  it("abrège la liste d’articles pour garder un lien utilisable", () => {
    const text = renderTemplate("{articles}", order);
    expect(encodeURIComponent(text).length).toBeLessThanOrEqual(1500);
    expect(text).toMatch(/… et \d+ autres articles$/);
  });
  it("signale les variables non autorisées", () => {
    expect(unknownVariables("Bonjour {prenom} {motdepasse}")).toEqual(["motdepasse"]);
  });
});

describe("lisibilité des couleurs (brief §6.3)", () => {
  it("met du texte bleu nuit sur l’orange PrestAfrik", () => {
    expect(colorReadability("#FF9900")).toMatchObject({ text: "#000026", readable: true });
    expect(contrastRatio("#000026", "#FFFFFF")).toBeGreaterThan(15);
  });
  it("choisit le texte blanc sur une couleur sombre et garde 4,5:1 au minimum", () => {
    expect(colorReadability("#176B52").text).toBe("#FFFFFF");
    for (const color of ["#808080", "#767676", "#FF9900", "#0B6E5A", "#C2185B"]) {
      expect(colorReadability(color).ratio).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("import et export CSV (brief §6.4)", () => {
  it("détecte le séparateur et sépare lignes valides et erreurs", () => {
    const result = analyzeProductCsv("reference;nom;prix;prix_promo\nA-1;Robe;18000;\nA-2;Sac;abc;\nA-3;Pagne;5000;6000\n");
    expect(result.rows.map((row) => row.sku)).toEqual(["A-1"]);
    expect(result.errors.map((error) => error.line)).toEqual([3, 4]);
  });
  it("neutralise les formules", () => {
    expect(safeCsvCell("=SOMME(A1)")).toBe(`"'=SOMME(A1)"`);
    expect(safeCsvCell("+237699")).toBe(`"'+237699"`);
  });
});

describe("pages en blocs (brief §6.5)", () => {
  it("refuse le HTML et les blocs inconnus", () => {
    expect(blocksSchema.safeParse([{ type: "paragraph", text: "<script>alert(1)</script>" }]).success).toBe(false);
    expect(blocksSchema.safeParse([{ type: "html", text: "x" }]).success).toBe(false);
    expect(blocksSchema.safeParse([{ type: "heading", text: "Notre histoire" }]).success).toBe(true);
  });
});

describe("assistant WhatsApp (brief §6.15)", () => {
  it("ne remplace que les variables connues", () => {
    expect(fillChatTemplate("Bonjour {boutique}, {question} {inconnue}", { boutique: "Mboa", question: "Livrez-vous à Kribi ?" })).toBe(
      "Bonjour Mboa, Livrez-vous à Kribi ? {inconnue}",
    );
  });
});

describe("périodes du tableau de bord (fuseau Africa/Douala)", () => {
  it("commence la journée à minuit heure de Douala", () => {
    const period = resolvePeriod({ periode: "aujourdhui" }, new Date("2026-10-15T08:00:00Z"));
    expect(period.from.toISOString()).toBe("2026-10-14T23:00:00.000Z");
    expect(period.to.toISOString()).toBe("2026-10-15T23:00:00.000Z");
  });
});
