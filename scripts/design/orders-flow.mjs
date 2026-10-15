// Vérifie « Valider » puis « Annuler » sur une nouvelle commande (base locale uniquement).
// Usage : node scripts/design/orders-flow.mjs <dossier-captures>
import { chromium } from "@playwright/test";
const out = process.argv[2] ?? "storage";
const browser = await chromium.launch();
const page = await (await browser.newContext({ storageState: "storage/design-session.json", viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const money = async () => {
  await page.goto("http://localhost:3000/dashboard/argent?periode=aujourdhui", { waitUntil: "networkidle" });
  return page.locator(".stat-card").first().innerText();
};
const before = await money();
await page.goto("http://localhost:3000/dashboard/commandes?onglet=nouvelles", { waitUntil: "networkidle", timeout: 180000 });
const card = page.locator(".order-card").first();
const reference = await card.locator(".v-ref").innerText();
const whatsappHref = await card.getByRole("link", { name: /Continuer sur WhatsApp/ }).getAttribute("href");
await card.getByRole("button", { name: /validée/i }).click();
await page.getByText("Commande validée !").waitFor();
const after = await money();
await page.goto("http://localhost:3000/dashboard/commandes?onglet=validees", { waitUntil: "networkidle" });
await page.locator(".order-card", { hasText: reference }).getByRole("link", { name: /Voir/ }).click();
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${out}/detail-validee.png`, fullPage: true });
await page.getByRole("button", { name: "Annuler la commande" }).click();
await page.getByRole("button", { name: "Oui, annuler" }).click();
await page.getByText("La commande est annulée.").waitFor();
const afterCancel = await money();
console.log({ reference, whatsapp: whatsappHref?.slice(0, 90), before, after, afterCancel, errors });
await browser.close();
