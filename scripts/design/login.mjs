// Ouvre une session de démonstration (base locale uniquement) et l'enregistre pour les captures.
// Usage : node scripts/design/login.mjs [email] [fichier]
import { chromium } from "@playwright/test";
const email = process.argv[2] ?? "vendeur1@example.test";
const file = process.argv[3] ?? "storage/design-session.json";
const password = process.env.SEED_DEMO_PASSWORD ?? "Demo-PrestAfrik-2026";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:3000/connexion", { waitUntil: "networkidle", timeout: 180000 });
await page.getByLabel("Adresse e-mail").fill(email);
await page.locator("input[name=password]").fill(password);
await page.getByRole("button", { name: /Me connecter/ }).click();
await page.waitForURL(/\/(dashboard|admin|boutiques)/, { timeout: 180000 });
await page.context().storageState({ path: file });
console.log("Session enregistrée :", file, "→", page.url());
await browser.close();
