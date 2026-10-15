// Parcours complet de l'assistant de création (base locale uniquement).
// Usage : node scripts/design/wizard-walk.mjs <dossier-captures> [largeur]
import { chromium } from "@playwright/test";
const out = process.argv[2] ?? "storage/wizard";
const width = Number(process.argv[3] ?? 1280);
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: "storage/design-session.json", viewport: { width, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
const shot = (name) => page.screenshot({ path: `${out}/${width}-${name}.png`, fullPage: true });
const next = async () => {
  await page.getByRole("button", { name: /Continuer|Publier ma boutique/ }).click();
  await page.waitForLoadState("networkidle");
};
const suffix = Date.now().toString(36).slice(-4);

await page.goto("http://localhost:3000/boutiques/nouvelle?nouvelle=1", { waitUntil: "networkidle", timeout: 180000 });
await page.getByLabel("Nom de la boutique").fill(`Atelier Test ${suffix}`);
await page.getByText(/Bonne nouvelle/).waitFor({ timeout: 15000 });
await shot("1-nom");
await next();
await page.waitForURL(/etape=2/);

await page.getByRole("button", { name: /Choisir une activité/ }).click();
await page.getByRole("combobox").fill("beaut");
await shot("2-activite-ouverte");
await page.keyboard.press("Enter");
await shot("2-activite");
await next();
await page.waitForURL(/etape=3/);

await page.getByRole("button", { name: /Choisir une région/ }).click();
await page.getByRole("combobox").fill("litt");
await page.keyboard.press("Enter");
await page.getByRole("button", { name: /Choisir une ville/ }).click();
await page.getByRole("combobox").fill("edea");
await shot("3-ville-ouverte");
await page.keyboard.press("Enter");
await page.getByLabel("Quartier (facultatif)").fill("Centre");
await shot("3-localisation");
await next();
await page.waitForURL(/etape=4/);

await page.locator("input[name=phoneNational]").fill("690112233");
await page.getByLabel("Adresse e-mail de contact (facultatif)").fill("contact@example.test");
await shot("4-coordonnees");
await next();
await page.waitForURL(/etape=5/);

await page.getByText("Mode et beauté").click();
await shot("5-theme");
await next();
await page.waitForURL(/etape=6/);
await shot("6-couleurs");
await next();
await page.waitForURL(/etape=7/);

await page.getByLabel("Nom du produit").fill("Robe wax test");
await page.getByLabel("Prix (en FCFA)").fill("18000");
await shot("7-produit");
await next();
await page.waitForURL(/etape=8/);
await shot("8-publication");
await next();
await page.waitForURL(/etape=publiee/, { timeout: 30000 });
await page.waitForTimeout(500);
await shot("9-publiee");
console.log("URL finale :", page.url());
console.log("Erreurs :", errors.length ? errors : "aucune");
await browser.close();
