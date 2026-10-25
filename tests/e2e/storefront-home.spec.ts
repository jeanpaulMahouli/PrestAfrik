import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { demoStore, demoVendor, signIn, skipWelcomePopup } from "./helpers";

// Accueil de la boutique de démonstration « Mboa Style » : 3 images de bannière (catégorie, produit,
// promotions), au moins 9 produits en promotion, 14 mis en avant et notés, pages « À propos » et
// « Contact », popup actif.

const home = `/${demoStore}`;
const promotionsUrl = new RegExp(`${home}/promotions$`);

test.beforeEach(async ({ page }, testInfo) => {
  if (!testInfo.titlePath.some((title) => title.includes("popup"))) await skipWelcomePopup(page);
});

test.describe("bannière", () => {
  test("défile toute seule, avec les flèches, et chaque image mène au bon endroit", async ({ page }) => {
    await page.goto(home);
    const banner = page.getByRole("region", { name: "Bannière de la boutique" });
    await expect(banner).toBeVisible();
    const dots = banner.getByRole("button", { name: /Afficher l’image/ });
    await expect(dots).toHaveCount(3);
    await expect(dots.nth(0)).toHaveAttribute("aria-current", "true");

    // Défilement automatique toutes les 5 secondes (souris hors de la bannière).
    await page.mouse.move(0, 0);
    await expect(dots.nth(1)).toHaveAttribute("aria-current", "true", { timeout: 8000 });

    await banner.hover();
    await banner.getByRole("button", { name: "Image suivante" }).click();
    await expect(dots.nth(2)).toHaveAttribute("aria-current", "true");

    const links = banner.locator(".sf-banner-link");
    await expect(links.nth(0)).toHaveAttribute("href", new RegExp(`^${home}\\?categorie=`));
    await expect(links.nth(1)).toHaveAttribute("href", new RegExp(`^${home}/[a-z0-9-]+$`));
    await expect(links.nth(2)).toHaveAttribute("href", `${home}/promotions`);

    await links.nth(2).click();
    await expect(page).toHaveURL(promotionsUrl, { timeout: 90_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Promotions" })).toBeVisible();
  });

  test("ne s’affiche pas pendant une recherche", async ({ page }) => {
    await page.goto(`${home}?q=zzzz`);
    await expect(page.getByRole("heading", { name: "Aucun produit trouvé" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Bannière de la boutique" })).toHaveCount(0);
  });
});

test.describe("promotions", () => {
  test("7 cartes avec badge de réduction, puis « Voir toutes les promotions »", async ({ page }) => {
    await page.goto(home);
    const rail = page.getByRole("list", { name: "Promotions" });
    await expect(rail.locator(".sf-card")).toHaveCount(7);
    const badges = rail.locator(".sf-discount-badge");
    await expect(badges).toHaveCount(7);
    const values = (await badges.allTextContents()).map((text) => Number(/-(\d+)/.exec(text)?.[1]));
    expect(values.every((value) => value > 0 && value < 100)).toBe(true);
    expect([...values].sort((a, b) => b - a)).toEqual(values);

    // Le badge correspond aux prix affichés (nouveau prix, puis ancien prix barré).
    const priceText = (await rail.locator(".sf-card").first().locator(".sf-price").innerText()).replace(/\s/g, "");
    const [promo, regular] = priceText.match(/\d+/g)!.map(Number);
    expect(Math.round(((regular - promo) / regular) * 100)).toBe(values[0]);

    const more = rail.getByRole("link", { name: /Voir toutes les promotions/ });
    await expect(more).toBeVisible();
    const total = Number(/(\d+) produits/.exec(await more.innerText())?.[1]);
    expect(total).toBeGreaterThan(7);
    await more.click();
    await expect(page).toHaveURL(promotionsUrl, { timeout: 90_000 });
    await expect(page.locator(".sf-promotions .sf-card")).toHaveCount(Math.min(total, 12));
    await expect(page.locator(".sf-promotions .sf-discount-badge")).toHaveCount(Math.min(total, 12));
  });
});

test.describe("sections paginées", () => {
  for (const [title, key] of [
    ["Nos produits mis en avant", "featured"],
    ["Les mieux notés", "top"],
  ] as const) {
    test(`« ${title} » : 12 produits par page et page dans l’adresse`, async ({ page }) => {
      await page.goto(home);
      const section = page.locator("section", { has: page.getByRole("heading", { name: title }) });
      await expect(section.locator(".sf-grid .sf-card")).toHaveCount(12);
      const pagination = section.getByRole("navigation", { name: `Pages : ${title}` });
      await pagination.getByRole("link", { name: "Page 2" }).click();
      await expect(page).toHaveURL(new RegExp(`[?&]${key}=2`), { timeout: 90_000 });
      await expect(section.locator(".sf-grid .sf-card")).toHaveCount(2);
      await expect(pagination.getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
      await page.goBack();
      await expect(section.locator(".sf-grid .sf-card")).toHaveCount(12);
    });
  }
});

test.describe("menu de la boutique", () => {
  test("ordinateur : « Boutique » en premier puis les pages publiées", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(home);
    const nav = page.locator(".sf-nav");
    await expect(nav.getByRole("link")).toHaveText(["Boutique", "À propos", "Contact"]);
    await expect(nav.getByRole("link", { name: "Boutique" })).toHaveAttribute("aria-current", "page");
    await nav.getByRole("link", { name: "Contact" }).click();
    await expect(page).toHaveURL(new RegExp(`${home}/page/contact$`), { timeout: 90_000 });
    await expect(page.locator(".sf-nav").getByRole("link", { name: "Contact" })).toHaveAttribute("aria-current", "page");
  });

  test("mobile : bouton menu avant le logo, panneau latéral fermé par Échap", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await skipWelcomePopup(page);
    await page.goto(home);
    await expect(page.locator(".sf-banner")).toBeVisible();
    // Aucun défilement horizontal de la page (rangée « Promotions » comprise).
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const button = page.getByRole("button", { name: "Ouvrir le menu de la boutique" });
    const [buttonBox, logoBox] = await Promise.all([button.boundingBox(), page.locator(".sf-brand").boundingBox()]);
    expect(buttonBox!.x).toBeLessThan(logoBox!.x);
    await button.click();
    const drawer = page.getByRole("dialog", { name: /Menu de/ });
    await expect(drawer.getByRole("link")).toHaveText(["Boutique", "À propos", "Contact"]);
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await context.close();
  });

  test("absent quand la boutique n’a aucune page publiée", async ({ page }) => {
    await page.goto("/douala-maison");
    await expect(page.locator(".sf-brand")).toBeVisible();
    await expect(page.locator(".sf-nav")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ouvrir le menu de la boutique" })).toHaveCount(0);
  });
});

test.describe("popup d’accueil", () => {
  test("s’affiche à l’ouverture, une seule fois par visite, et se ferme avec le X", async ({ page }) => {
    await page.goto(home);
    const popup = page.getByRole("dialog", { name: /Soldes de la semaine/ });
    await expect(popup).toBeVisible();
    const close = popup.getByRole("button", { name: "Fermer" });
    const box = await close.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await close.click();
    await expect(popup).toHaveCount(0);

    await page.reload();
    await expect(page.locator(".sf-brand")).toBeVisible();
    await page.waitForTimeout(2500);
    await expect(page.getByRole("dialog", { name: /Soldes de la semaine/ })).toHaveCount(0);
  });
});

test.describe("bannière dans le tableau de bord", () => {
  test("4 images au maximum", async ({ page }) => {
    await signIn(page, demoVendor, "/dashboard/boutique/banniere");
    await page.goto("/dashboard/boutique/banniere");
    await expect(page.getByText("3 images sur 4")).toBeVisible();

    const image = await sharp({ create: { width: 1920, height: 1080, channels: 3, background: "#ff9900" } }).png().toBuffer();
    const add = page.locator(".banner-add");
    await add.locator('input[type="file"]').setInputFiles({ name: "test.png", mimeType: "image/png", buffer: image });
    await add.getByRole("button", { name: "Ajouter à la bannière" }).click();
    await expect(page.getByText("4 images sur 4")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Vous avez atteint les 4 images autorisées. Supprimez-en une pour en ajouter une nouvelle.")).toBeVisible();
    await expect(page.locator(".banner-add")).toHaveCount(0);

    // Remise en état : suppression de l'image ajoutée.
    await page.getByRole("button", { name: "Supprimer l’image 4" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Supprimer l’image" }).click();
    await expect(page.getByText("3 images sur 4")).toBeVisible({ timeout: 60_000 });
  });
});
