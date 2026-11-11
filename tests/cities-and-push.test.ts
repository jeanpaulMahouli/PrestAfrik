import { describe, expect, it } from "vitest";
import { canonicalCity, cityLabel, userCityFromStores } from "@/modules/geo";
import { defaultPushTemplates, inactivitySentence, renderPushText, safePushUrl } from "@/modules/push/templates";

describe("villes cohérentes dans l'administration", () => {
  it("ramène les variantes d'écriture à la ville de la liste", () => {
    expect(canonicalCity("douala")).toBe("Douala");
    expect(canonicalCity("  DOUALA ")).toBe("Douala");
    expect(canonicalCity("yaounde")).toBe("Yaoundé");
    expect(canonicalCity("Yaoundé")).toBe("Yaoundé");
  });

  it("garde les villes hors liste, nettoyées, et traite les villes vides", () => {
    expect(canonicalCity("petit  village")).toBe("Petit village");
    expect(canonicalCity("   ")).toBeNull();
    expect(canonicalCity(null)).toBeNull();
    expect(cityLabel("")).toBe("Ville non renseignée");
  });

  it("croise la ville d'un utilisateur avec ses boutiques (propriétaire d'abord, la plus fréquente)", () => {
    expect(userCityFromStores([])).toBeNull();
    // Gestionnaire à Yaoundé, propriétaire à Douala : Douala.
    expect(userCityFromStores([{ city: "Yaoundé", owner: false }, { city: "douala", owner: true }])).toBe("Douala");
    // Deux boutiques à Kribi contre une à Douala.
    expect(userCityFromStores([{ city: "Douala", owner: true }, { city: "kribi", owner: true }, { city: "Kribi", owner: true }])).toBe("Kribi");
    // Égalité : la plus ancienne.
    expect(userCityFromStores([{ city: "limbe", owner: true }, { city: "Buea", owner: true }])).toBe("Limbe");
    // Aucune boutique en propre : celles où il travaille.
    expect(userCityFromStores([{ city: "garoua", owner: false }])).toBe("Garoua");
  });
});

describe("textes des notifications push", () => {
  it("remplace les variables et nettoie les espaces", () => {
    const { title, body } = defaultPushTemplates.INACTIVITY;
    expect(renderPushText(title, { prenom: "Awa" })).toBe("Vous nous manquez, Awa !");
    expect(renderPushText(body, { boutique: "Mboa Style", activite: inactivitySentence(2) })).toBe("2 nouvelles commandes vous attendent. Passez voir ce qui se passe dans Mboa Style.");
    expect(renderPushText("Bonjour {inconnu}, à bientôt", {})).toBe("Bonjour, à bientôt");
  });

  it("n'ouvre que des pages de PrestAfrik", () => {
    expect(safePushUrl("/dashboard/commandes")).toBe("/dashboard/commandes");
    expect(safePushUrl("https://exemple.com")).toBe("/dashboard");
    expect(safePushUrl("//exemple.com")).toBe("/dashboard");
    expect(safePushUrl("javascript:alert(1)")).toBe("/dashboard");
  });

  it("annonce l'activité depuis la dernière visite", () => {
    expect(inactivitySentence(0)).toMatch(/peut-être/);
    expect(inactivitySentence(1)).toBe("1 nouvelle commande vous attend.");
  });
});
