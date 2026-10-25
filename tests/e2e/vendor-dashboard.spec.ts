import { expect, test } from "@playwright/test";
import { demoVendor, signIn } from "./helpers";

// Espace vendeur de démonstration : vendeur1 gère « Mboa Style » (propriétaire) et « Douala Maison » (gérant).

test.describe.configure({ mode: "serial" });

test("reconnexion dans la dernière boutique utilisée, depuis un autre appareil", async ({ browser }) => {
  const first = await browser.newContext();
  const page = await first.newPage();
  await signIn(page, demoVendor);
  await page.goto("/dashboard");
  const switcher = page.getByRole("button", { name: /^Changer de boutique/ });
  await expect(switcher).toBeVisible();

  // Passage sur « Douala Maison », puis déconnexion.
  await switcher.click();
  await page.getByRole("button", { name: /Douala Maison/ }).click();
  await expect(page.getByRole("button", { name: "Changer de boutique (Douala Maison)" })).toBeVisible({ timeout: 60_000 });
  await first.close();

  // Nouvel appareil (aucun cookie) : la connexion ouvre directement « Douala Maison ».
  const second = await browser.newContext();
  const other = await second.newPage();
  await signIn(other, demoVendor);
  await other.goto("/dashboard");
  await expect(other.getByRole("button", { name: "Changer de boutique (Douala Maison)" })).toBeVisible({ timeout: 60_000 });

  // Remise en état pour les autres tests : retour sur « Mboa Style ».
  await other.getByRole("button", { name: /^Changer de boutique/ }).click();
  await other.getByRole("button", { name: /Mboa Style/ }).click();
  await expect(other.getByRole("button", { name: "Changer de boutique (Mboa Style)" })).toBeVisible({ timeout: 60_000 });
  await second.close();
});

test("tableau de bord : chiffres clés, période et graphiques", async ({ page }) => {
  await signIn(page, demoVendor);
  await page.goto("/dashboard?periode=30j");
  const kpis = page.getByRole("region", { name: "Chiffres clés" });
  for (const label of ["Commandes", "Argent encaissé", "En attente de confirmation", "Visites de la boutique", "Panier moyen"]) {
    await expect(kpis.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("navigation", { name: "Période" }).getByRole("link", { name: "30 jours" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Commandes par jour" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Argent encaissé par jour" })).toBeVisible();

  await page.getByRole("navigation", { name: "Période" }).getByRole("link", { name: "3 mois" }).click();
  await expect(page.getByRole("heading", { name: "Commandes par semaine" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Dernières commandes" })).toBeVisible();
  await expect(page.locator(".latest-orders li")).toHaveCount(5);
});
