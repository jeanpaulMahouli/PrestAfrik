// Vérifie les parcours sensibles au « contexte non sécurisé » (http sur l'adresse du réseau local,
// comme un téléphone) : copie du lien, « Commander maintenant », ajout de photo, assistant.
// Usage : node scripts/design/lan-check.mjs <http://IP:3000> <dossier-captures>
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const origin = process.argv[2] ?? "http://172.20.10.2:3000";
const out = process.argv[3] ?? "storage";
const browser = await chromium.launch();
const results = {};
const errors = [];

// 1. Client : « Commander maintenant » puis formulaire, et assistant.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`client: ${error.message}`));
  await page.goto(`${origin}/boutique/mboa-style`, { waitUntil: "networkidle", timeout: 180000 });
  results.secureContext = await page.evaluate(() => window.isSecureContext);
  await page.getByRole("button", { name: /Une question/ }).click();
  await page.locator(".sf-chat-chips button").nth(0).click();
  await page.screenshot({ path: join(out, "lan-assistant-reponse.png") });
  await page.getByRole("button", { name: "Parler au vendeur" }).click();
  await page.screenshot({ path: join(out, "lan-assistant-whatsapp.png") });
  await page.getByRole("button", { name: "Fermer la discussion" }).click();
  await page.screenshot({ path: join(out, "lan-accueil.png") });
  await page.locator(".sf-card-link").first().click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Commander maintenant" }).click();
  await page.waitForURL(/\/commande$/);
  await page.getByText("Finaliser ma commande").waitFor();
  await page.waitForTimeout(1500);
  results.checkoutKey = await page.locator("input[name=idempotencyKey]").inputValue();
  await context.close();
}

// 2. Vendeur : copie du lien et ajout d'une photo produit.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`vendeur: ${error.message}`));
  await page.goto(`${origin}/connexion`, { waitUntil: "networkidle", timeout: 180000 });
  await page.getByLabel("Adresse e-mail").fill("vendeur1@example.test");
  await page.locator("input[name=password]").fill(process.env.SEED_DEMO_PASSWORD ?? "Demo-PrestAfrik-2026");
  await page.getByRole("button", { name: /Me connecter/ }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 180000 });
  await page.getByRole("button", { name: /Partager ma boutique/ }).first().click();
  await page.getByRole("button", { name: "Copier", exact: true }).click();
  results.copy = await page.locator(".share-link-row button").innerText();

  const png = await sharp({ create: { width: 600, height: 600, channels: 3, background: "#ff9900" } }).png().toBuffer();
  const file = join(out, "photo-test.png");
  writeFileSync(file, png);
  await page.goto(`${origin}/dashboard/produits/nouveau`, { waitUntil: "networkidle" });
  const upload = page.waitForResponse((response) => response.url().includes("/api/dashboard/produits/photos"), { timeout: 60000 }).catch(() => null);
  await page.locator("input[type=file]").first().setInputFiles(file);
  const response = await upload;
  results.photoUpload = response ? response.status() : "aucune requête";
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, "lan-photo.png") });
  await context.close();
}

console.log(JSON.stringify({ results, errors }, null, 2));
await browser.close();
