import { expect, test } from "@playwright/test";
import { demoAdmin, signIn } from "./helpers";

// Administration de démonstration : admin@prestafrik.example.test est super administrateur (seed).

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await signIn(page, demoAdmin, "/admin");
});

test("tableau de bord : chiffres clés, villes, utilisateurs actifs et boutiques visitées", async ({ page }) => {
  await page.goto("/admin");
  const kpis = page.getByRole("region", { name: "Chiffres clés" });
  for (const label of ["Boutiques créées", "Boutiques publiées", "Utilisateurs", "Nouveaux utilisateurs"]) {
    await expect(kpis.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Utilisateurs par ville" })).toBeVisible();
  await expect(page.locator(".city-bars li").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Top 10 des boutiques les plus visitées/ })).toBeVisible();
  await expect(page.locator(".admin-ranking li").first()).toBeVisible();
});

test("prospection : filtres combinables et lien WhatsApp", async ({ page }) => {
  await page.goto("/admin/prospection");
  await expect(page.getByRole("heading", { name: "Prospection" })).toBeVisible();
  const total = Number((await page.locator(".prospection-count .badge").innerText()).replace(/\D/g, ""));
  expect(total).toBeGreaterThan(0);

  await page.getByLabel("Utilisateurs actifs (30 jours)").check();
  await page.getByLabel("Besoin d’assistance").check();
  await page.getByRole("button", { name: "Appliquer" }).click();
  await expect(page).toHaveURL(/filtre=actifs/);
  await expect(page).toHaveURL(/filtre=assistance/);
  const filtered = Number((await page.locator(".prospection-count .badge").innerText()).replace(/\D/g, ""));
  expect(filtered).toBeLessThanOrEqual(total);

  // Sans filtre : premier lien WhatsApp au format wa.me/{chiffres}?text=…
  await page.goto("/admin/prospection");
  const link = page.getByRole("link", { name: /Écrire à .* sur WhatsApp/ }).first();
  const href = await link.getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/\d{8,15}\?text=/);
  expect(decodeURIComponent(href!)).toContain("c’est l’équipe PrestAfrik");
});

test("administrateurs : impossible de modifier ses propres droits, promotion puis retrait", async ({ page }) => {
  await page.goto("/admin/administrateurs");
  const myRow = page.getByRole("row", { name: /\(vous\)/ });
  await expect(myRow.getByText("Vous ne pouvez pas modifier vos propres droits.")).toBeVisible();

  // Promotion d'un vendeur : la case de confirmation est obligatoire.
  await page.getByRole("button", { name: "Ajouter un administrateur" }).click();
  const dialog = page.getByRole("dialog", { name: "Ajouter un administrateur" });
  await dialog.getByLabel("Adresse e-mail du compte").fill("vendeur3@example.test");
  await dialog.getByRole("button", { name: "Donner les droits" }).click();
  await expect(dialog.getByLabel(/Je confirme donner ces droits/)).toBeFocused();
  await dialog.getByLabel(/Je confirme donner ces droits/).check();
  await dialog.getByRole("button", { name: "Donner les droits" }).click();
  await expect(page.getByRole("status")).toContainText("est maintenant administrateur");
  const promoted = page.getByRole("row", { name: /vendeur3@example\.test/ });
  await expect(promoted).toBeVisible();

  // Retrait des droits (remise en état), avec confirmation.
  await promoted.getByRole("button", { name: "Retirer les droits" }).click();
  const confirm = page.getByRole("dialog", { name: /Retirer les droits/ });
  await confirm.getByLabel("Je confirme retirer les droits d’administration.").check();
  await confirm.getByRole("button", { name: "Retirer les droits" }).click();
  await expect(page.getByRole("status")).toContainText("n’a plus accès à l’administration");
  await expect(page.getByRole("row", { name: /vendeur3@example\.test/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Historique des droits" })).toBeVisible();
});

test("cloche des notifications techniques : panneau, tout marquer comme lu", async ({ page }) => {
  await page.goto("/admin");
  const bell = page.getByRole("button", { name: /Notifications techniques/ });
  // La cloche est juste avant l'avatar.
  const [bellBox, avatarBox] = await Promise.all([bell.boundingBox(), page.getByRole("button", { name: "Mon compte" }).boundingBox()]);
  expect(bellBox!.x).toBeLessThan(avatarBox!.x);
  await bell.click();
  await expect(page.getByText("Notifications techniques", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir tout" })).toBeVisible();
  const markAll = page.getByRole("button", { name: "Tout marquer comme lu" });
  if (await markAll.isVisible()) {
    await markAll.click();
    await expect(page.locator(".bell-count")).toHaveCount(0);
  }
  await page.getByRole("link", { name: "Voir tout" }).click();
  await expect(page.getByRole("heading", { name: "Notifications techniques" })).toBeVisible({ timeout: 60_000 });
});
