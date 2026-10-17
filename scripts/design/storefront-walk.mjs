// Parcours client complet sur la boutique de démonstration (base locale uniquement).
// Usage : node scripts/design/storefront-walk.mjs <dossier-captures> [largeur] [slug]
import { chromium } from "@playwright/test";
const out = process.argv[2] ?? "storage";
const width = Number(process.argv[3] ?? 390);
const slug = process.argv[4] ?? "mboa-style";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: width < 500 ? 2 : 1 })).newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
const shot = (name) => page.screenshot({ path: `${out}/sf-${width}-${name}.png`, fullPage: true });
const base = `http://localhost:3000/${slug}`;

await page.goto(base, { waitUntil: "networkidle", timeout: 180000 });
await shot("1-accueil");
await page.locator(".sf-card-link").first().click();
await page.waitForLoadState("networkidle");
const options = page.locator(".sf-chips-options button:not([disabled])");
if (await options.count()) await options.nth(Math.min(1, (await options.count()) - 1)).click();
await shot("2-produit");
await page.getByRole("button", { name: "Ajouter au panier" }).click();
await page.getByText("Ajouté au panier !").waitFor();
await page.goto(`${base}/panier`, { waitUntil: "networkidle" });
await page.locator(".sf-lines li").first().waitFor();
await shot("3-panier");
await page.getByRole("link", { name: "Commander", exact: true }).click();
await page.waitForURL(/\/commande$/);
await page.waitForLoadState("networkidle");
await shot("4-commande-vide");
await page.getByLabel("Votre nom").fill("Estelle Nkoa");
await page.locator("input[name=whatsappNational]").fill("690112233");
const zone = page.locator("select[name=zoneId]");
if (await zone.count()) {
  await zone.selectOption({ index: 1 });
  await page.getByLabel("Point de repère").fill("Près de la pharmacie du carrefour");
}
await page.getByLabel(/suivi de ma commande/).check();
await shot("5-commande-complete");
await page.getByRole("button", { name: "Commander", exact: true }).click();
await page.waitForURL(/\/suivi\//, { timeout: 30000 });
await page.waitForLoadState("networkidle");
await shot("6-resultat");
console.log("URL :", page.url());
console.log("Erreurs :", errors.length ? errors : "aucune");
await browser.close();
