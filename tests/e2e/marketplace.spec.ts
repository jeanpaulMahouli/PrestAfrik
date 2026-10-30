import { expect, test } from "@playwright/test";

// Recherche de vendeurs, pages publiques et liens internes de la landing.
// Les suggestions sont simulées (réponses stables) ; la page de résultats lit la base de démonstration.

const suggestions = [
  { name: "Mboa Style", slug: "mboa-style", href: "/mboa-style", city: "Douala", country: "Cameroun", activity: "Vêtements et mode", logoUrl: null },
  { name: "Mboa Beauté", slug: "mboa-beaute", href: "/mboa-beaute", city: "Yaoundé", country: "Cameroun", activity: "Beauté", logoUrl: null },
];

test("la page Nos boutiques propose des vendeurs pendant la saisie, avec le texte mis en évidence", async ({ page }) => {
  await page.route("**/api/recherche?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ suggestions }) }));
  await page.goto("/nos-boutiques");
  const box = page.getByRole("combobox", { name: "Rechercher un vendeur, une boutique ou une ville" });
  await box.fill("mbo");
  await expect(page.getByRole("option")).toHaveCount(2);
  await expect(page.getByRole("option").first().locator("mark")).toHaveText("Mbo");
  await expect(box).toHaveAttribute("aria-expanded", "true");
});

test("la recherche se pilote au clavier : flèches, Échap, Entrée", async ({ page }) => {
  await page.route("**/api/recherche?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ suggestions }) }));
  await page.goto("/nos-boutiques");
  const box = page.getByRole("combobox", { name: "Rechercher un vendeur, une boutique ou une ville" });
  await box.fill("mboa");
  await expect(page.getByRole("option")).toHaveCount(2);
  await box.press("ArrowDown");
  await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
  await box.press("ArrowDown");
  await expect(page.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
  await box.press("Escape");
  await expect(box).toHaveAttribute("aria-expanded", "false");
  await box.press("Enter");
  await page.waitForURL(/\/recherche\?q=mboa/);
});

test("la recherche signale l'absence de résultat et l'erreur réseau, avec « Réessayer »", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/recherche?**", (route) => {
    calls += 1;
    return calls === 1 ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ suggestions: [] }) }) : route.abort("failed");
  });
  await page.goto("/nos-boutiques");
  const box = page.getByRole("combobox", { name: "Rechercher un vendeur, une boutique ou une ville" });
  await box.fill("zzzq");
  await expect(page.getByText("Aucun vendeur ne correspond à « zzzq ». Essayez un nom de ville ou une activité.")).toBeVisible();
  await box.fill("zzzqx");
  await expect(page.locator(".vendor-search-state[role=alert]")).toContainText("La recherche n’a pas pu aboutir");
  await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
});

test("la page de résultats affiche des cartes boutique avec « Découvrir la boutique »", async ({ page }) => {
  await page.goto("/recherche?q=mboa");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("pour « mboa »");
  const cards = page.locator(".search-card");
  await expect(cards.first()).toBeVisible();
  await expect(cards.first().getByRole("link", { name: "Découvrir la boutique" })).toBeVisible();
});

test("une recherche sans résultat n'est pas indexée et propose des pistes", async ({ page }) => {
  await page.goto("/recherche?q=xyzabcq");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pas encore de boutique pour « xyzabcq »");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("link", { name: "Créer ma boutique gratuitement" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Douala" })).toBeVisible();
});

test("la page Tarifs bascule entre mensuel et annuel et affiche l'économie", async ({ page }) => {
  await page.goto("/tarifs");
  await expect(page.getByRole("heading", { name: "Business" })).toBeVisible();
  await expect(page.getByText("Recommandé", { exact: true })).toBeVisible();
  await expect(page.locator(".pricing-plan").nth(1).locator(".pricing-price strong")).toHaveText("3 000 FCFA");
  await expect(page.getByRole("button", { name: "Bientôt disponible" }).first()).toBeDisabled();
  await page.getByRole("button", { name: /Annuel/ }).click();
  await expect(page.locator(".pricing-plan").nth(1).locator(".pricing-price strong")).toHaveText("29 000 FCFA");
  await expect(page.locator(".pricing-plan").nth(1)).toContainText("Vous économisez 7 000 FCFA (19 %)");
});

test("aucun lien interne de la landing ne mène à une page introuvable ou à « # »", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.locator("a[href]").evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
  expect(hrefs.filter((href) => href === "#" || href === "")).toEqual([]);
  const internal = [...new Set(hrefs.filter((href) => href.startsWith("/") && !href.startsWith("//")).map((href) => href.split("#")[0] || "/"))];
  for (const href of internal) {
    const response = await request.get(href, { maxRedirects: 5 });
    expect(response.status(), `${href} renvoie ${response.status()}`).toBeLessThan(400);
  }
});

test("l’accueil invite à découvrir les boutiques", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Vous cherchez une boutique ? Consultez nos vendeurs" })).toBeVisible();
  // Bouton animé en continu (il « flotte ») : on suit son lien plutôt que d'attendre qu'il s'immobilise.
  const link = page.getByRole("link", { name: "Voir toutes nos boutiques" });
  await expect(link).toHaveAttribute("href", "/nos-boutiques");
  await page.goto("/nos-boutiques");
  await expect(page.getByRole("heading", { name: /Top 10/i })).toBeVisible();
});
