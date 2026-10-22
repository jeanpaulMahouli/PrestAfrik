// Parcours de l'administration et de la photo de profil (base locale de démonstration uniquement).
// Usage : node scripts/design/admin-walk.mjs <dossier>
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { join } from "node:path";

const out = process.argv[2] ?? "storage/admin-walk";
const password = process.env.SEED_DEMO_PASSWORD ?? "Demo-PrestAfrik-2026";
const base = "http://localhost:3000";
const browser = await chromium.launch();

async function login(context, email) {
  const page = await context.newPage();
  await page.goto(`${base}/connexion`, { waitUntil: "networkidle", timeout: 180000 });
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.locator("input[name=password]").fill(password);
  await page.getByRole("button", { name: /Me connecter/ }).click();
  await page.waitForURL(/\/(dashboard|admin|boutiques)/, { timeout: 180000 });
  return page;
}

// 1. Administration, ordinateur puis mobile.
for (const width of [1280, 390]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await login(context, "admin@prestafrik.example.test");
  for (const path of ["/admin", "/admin/abonnements", "/admin/messages", "/admin/alertes", "/admin/utilisateurs", "/admin/journal"]) {
    await page.goto(base + path, { waitUntil: "networkidle", timeout: 180000 });
    const name = path.replace(/\//g, "_") || "_";
    await page.screenshot({ path: join(out, `${width}${name}.png`), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(width, path, (await page.title()), overflow ? "DÉBORDEMENT HORIZONTAL" : "ok");
  }
  if (width === 1280) {
    // Suspension puis rétablissement d'une boutique.
    await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Suspendre" }).first().click();
    await page.locator("textarea[name=reason]").fill("Vérification du parcours de suspension");
    await page.screenshot({ path: join(out, "1280_suspend-dialog.png") });
    await page.getByRole("button", { name: "Suspendre la boutique" }).click();
    await page.waitForURL(/succes=/, { timeout: 60000 });
    console.log("suspension :", await page.locator(".v-banner-success").textContent());
    await page.screenshot({ path: join(out, "1280_after-suspend.png"), fullPage: true });
    await page.getByRole("button", { name: "Rétablir" }).first().click();
    await page.waitForURL(/R%C3%A9tablie|rétablie|succes=/, { timeout: 60000 });
    await page.waitForLoadState("networkidle");
    console.log("rétablissement :", await page.locator(".v-banner-success").textContent());
  }
  await context.close();
}

// 2. Un vendeur n'accède pas à l'administration ; photo de profil.
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await login(context, "vendeur1@example.test");
const response = await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
console.log("vendeur sur /admin :", response?.status());
await page.goto(`${base}/dashboard/profil`, { waitUntil: "networkidle" });
const avatar = await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 255, g: 153, b: 0 } } }).png().toBuffer();
await page.locator("input[name=avatar]").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: avatar });
await page.getByRole("button", { name: "Enregistrer" }).click();
await page.getByText("Photo de profil mise à jour.").waitFor({ timeout: 60000 });
await page.reload({ waitUntil: "networkidle" });
const topbarImage = await page.locator(".user-avatar img").getAttribute("src");
console.log("avatar dans la barre :", topbarImage);
const media = await page.request.get(base + topbarImage);
console.log("avatar servi :", media.status(), media.headers()["content-type"]);
await page.screenshot({ path: join(out, "1280_profil.png"), fullPage: true });
await page.getByRole("button", { name: "Retirer" }).click();
await page.getByText("Photo de profil retirée.").waitFor({ timeout: 60000 });
console.log("avatar retiré");
await browser.close();
