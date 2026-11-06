import { expect, test } from "@playwright/test";

// Marketplace (accueil de prestafrik.com), page « Devenir vendeur » (/boutique) et liens internes.
// Les suggestions sont simulées (réponses stables) ; la page de résultats lit la base de démonstration.

const suggestions = [
  { name: "Mboa Style", slug: "mboa-style", href: "/mboa-style", city: "Douala", country: "Cameroun", activity: "Vêtements et mode", logoUrl: null },
  { name: "Mboa Beauté", slug: "mboa-beaute", href: "/mboa-beaute", city: "Yaoundé", country: "Cameroun", activity: "Beauté", logoUrl: null },
];

test("la marketplace propose des vendeurs pendant la saisie, avec le texte mis en évidence", async ({ page }) => {
  await page.route("**/api/recherche?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ suggestions }) }));
  await page.goto("/");
  const box = page.getByRole("combobox", { name: "Rechercher un vendeur, une boutique ou une ville" });
  await box.fill("mbo");
  await expect(page.getByRole("listbox", { name: "Vendeurs suggérés" }).getByRole("option")).toHaveCount(2);
  await expect(page.getByRole("listbox", { name: "Vendeurs suggérés" }).getByRole("option").first().locator("mark")).toHaveText("Mbo");
  await expect(box).toHaveAttribute("aria-expanded", "true");
});

test("la recherche se pilote au clavier : flèches, Échap, Entrée", async ({ page, context, baseURL }) => {
  // Univers déjà choisi : sinon Échap ferme la fenêtre d'accueil « Que recherchez-vous ? » (et recharge la page).
  await context.addCookies([{ name: "shop_univers", value: "vente", url: baseURL ?? "http://localhost:3000" }]);
  await page.route("**/api/recherche?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ suggestions }) }));
  await page.goto("/");
  const box = page.getByRole("combobox", { name: "Rechercher un vendeur, une boutique ou une ville" });
  await box.fill("mboa");
  await expect(page.getByRole("listbox", { name: "Vendeurs suggérés" }).getByRole("option")).toHaveCount(2);
  await box.press("ArrowDown");
  await expect(page.getByRole("listbox", { name: "Vendeurs suggérés" }).getByRole("option").first()).toHaveAttribute("aria-selected", "true");
  await box.press("ArrowDown");
  await expect(page.getByRole("listbox", { name: "Vendeurs suggérés" }).getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
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
  await page.goto("/");
  const box = page.getByRole("combobox", { name: "Rechercher un vendeur, une boutique ou une ville" });
  await box.fill("zzzq");
  await expect(page.getByText("Aucun vendeur ne correspond à « zzzq ». Essayez un nom de ville ou une activité.")).toBeVisible();
  await box.fill("zzzqx");
  await expect(page.locator(".vendor-search-state[role=alert]")).toContainText("La recherche n’a pas pu aboutir");
  await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
});

test("l'ancienne adresse /nos-boutiques mène à l'accueil, qui est la marketplace", async ({ page }) => {
  await page.goto("/nos-boutiques/recherche?q=robe");
  await expect(page).toHaveURL(/\/recherche\?q=robe$/);
  await page.goto("/nos-boutiques");
  await expect(page).toHaveURL(/:\d+\/$/);
  await expect(page).toHaveTitle(/^PrestAfrik – La marketplace du Cameroun/);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toContainText("PrestAfrik, la marketplace");
  const types = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => scripts.flatMap((script) => (JSON.parse(script.textContent ?? "{}")["@graph"] ?? []).map((item: { "@type": string }) => item["@type"])));
  expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite"]));
});

test("une recherche de la marketplace n'est pas indexée", async ({ page }) => {
  await page.goto("/recherche?q=xyzabcq");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Résultats pour « xyzabcq »");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

for (const device of [
  { name: "ordinateur", viewport: { width: 1366, height: 820 }, banner: ".shop-hero .shop-seller" },
  { name: "téléphone", viewport: { width: 390, height: 844 }, banner: ".shop-hero-mobile .shop-seller" },
]) {
  test(`la bannière principale mène à « Devenir vendeur » avec les paramètres de la publicité (${device.name})`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: device.viewport, isMobile: device.name === "téléphone", hasTouch: device.name === "téléphone" });
    // Univers déjà choisi : la fenêtre d'accueil ne cache pas la bannière.
    await context.addCookies([{ name: "shop_univers", value: "vente", url: baseURL ?? "http://localhost:3000" }]);
    const page = await context.newPage();
    await page.goto("/?utm_source=facebook&utm_campaign=lancement&fbclid=abc");
    const banner = page.locator(device.banner);
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute("href", "/boutique");
    await expect(banner.getByText("Devenir vendeur")).toBeInViewport();
    // Toute la bannière est cliquable, pas seulement le bouton : on clique sur le titre.
    await banner.getByText("Vendez en ligne sans limite").click();
    await expect(page).toHaveURL(/\/boutique\?utm_source=facebook&utm_campaign=lancement&fbclid=abc$/);
    await expect(page).toHaveTitle(/^Vendez en ligne sans limite avec PrestAfrik/);
    await context.close();
  });
}

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

test("aucun lien interne de la page « Devenir vendeur » ne mène à une page introuvable ou à « # »", async ({ page, request }) => {
  await page.goto("/boutique");
  const hrefs = await page.locator("a[href]").evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
  expect(hrefs.filter((href) => href === "#" || href === "")).toEqual([]);
  const internal = [...new Set(hrefs.filter((href) => href.startsWith("/") && !href.startsWith("//")).map((href) => href.split("#")[0] || "/"))];
  for (const href of internal) {
    const response = await request.get(href, { maxRedirects: 5 });
    expect(response.status(), `${href} renvoie ${response.status()}`).toBeLessThan(400);
  }
});

test("la marketplace propose la recherche sans bouton « Rechercher »", async ({ page }) => {
  // Le lien « Voir toutes les boutiques » de la page vendeurs est désactivé pour l'instant (partners.showStoresLink).
  await page.goto("/boutique");
  await expect(page.getByRole("link", { name: "Voir toutes les boutiques" })).toHaveCount(0);
  await page.goto("/");
  // Recherche sous l'en-tête, sans bouton « Rechercher » : Entrée lance la recherche.
  await expect(page.getByRole("button", { name: "Rechercher" })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: /Rechercher un vendeur/ })).toBeVisible();
});
