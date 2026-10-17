// Génère les captures réelles utilisées par la landing page (données de démonstration, base locale).
// Usage : node scripts/design/landing-shots.mjs   → public/landing/*.webp
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = "public/landing";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

async function save(page, name, width) {
  await page.addStyleTag({ content: "nextjs-portal, [data-nextjs-toast], .navigation-loading { display: none !important; }" });
  await page.waitForTimeout(600);
  const png = await page.screenshot();
  await sharp(png).resize({ width }).webp({ quality: 82 }).toFile(`${out}/${name}.webp`);
  console.log("ok", name);
}

// Espace vendeur (1280 px).
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${base}/connexion`, { waitUntil: "networkidle", timeout: 180000 });
  await page.getByLabel("Adresse e-mail").fill("vendeur1@example.test");
  await page.locator("input[name=password]").fill(process.env.SEED_DEMO_PASSWORD ?? "Demo-PrestAfrik-2026");
  await page.getByRole("button", { name: /Me connecter/ }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 180000 });
  const shots = [
    ["vendeur-accueil", "/dashboard?periode=30-jours"],
    ["vendeur-commandes", "/dashboard/commandes"],
    ["vendeur-livraisons", "/dashboard/livraisons"],
    ["vendeur-clients", "/dashboard/clients"],
    ["vendeur-argent", "/dashboard/argent?periode=30-jours"],
  ];
  for (const [name, path] of shots) {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 180000 });
    await save(page, name, 1280);
  }
  await context.close();
}

// Boutique côté client (téléphone).
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const shop = `${base}/mboa-style`;
  await page.goto(shop, { waitUntil: "networkidle", timeout: 180000 });
  await save(page, "client-boutique", 520);
  await page.locator(".sf-card-link").first().click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await page.goto(`${shop}/commande`, { waitUntil: "networkidle" });
  await page.getByLabel("Votre nom").fill("Estelle Nkoa");
  await page.locator("input[name=whatsappNational]").fill("690112233");
  await page.locator("select[name=zoneId]").selectOption({ index: 1 });
  await page.getByLabel("Point de repère").fill("Près de la pharmacie du carrefour");
  await page.getByLabel(/suivi de ma commande/).check();
  await save(page, "client-commande", 520);
  await page.getByRole("button", { name: "Commander", exact: true }).click();
  await page.waitForURL(/\/suivi\//, { timeout: 60000 });
  await page.waitForLoadState("networkidle");
  await save(page, "client-suivi", 520);
  await context.close();
}

await browser.close();
