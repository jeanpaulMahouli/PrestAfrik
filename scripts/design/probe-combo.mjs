// Ouvre la liste « Région » de l'assistant (étape 3) pour vérifier la feuille basse mobile.
// Usage : node scripts/design/probe-combo.mjs <capture.png> <storeId>
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await (await browser.newContext({ storageState: "storage/design-session.json", viewport: { width: 390, height: 844 } })).newPage();
await page.goto(`http://localhost:3000/boutiques/nouvelle?boutique=${process.argv[3]}&etape=3`, { waitUntil: "networkidle" });
await page.locator(".combobox-trigger").nth(1).click();
await page.screenshot({ path: process.argv[2] });
console.log(await page.locator(".combobox-list li").first().evaluate((el) => getComputedStyle(el).paddingLeft));
await browser.close();
