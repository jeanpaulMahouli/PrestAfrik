// Capture simple d'une route : node scripts/design/shot.mjs <route> <sortie.png> [largeur] [--click=selecteur] [--full]
import { chromium } from "@playwright/test";
const [route, out, width = "390", ...flags] = process.argv.slice(2);
const click = flags.find((f) => f.startsWith("--click="))?.slice(8);
const state = flags.find((f) => f.startsWith("--state="))?.slice(8) ?? "storage/design-session.json";
const browser = await chromium.launch();
const w = Number(width);
const context = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, deviceScaleFactor: w < 500 ? 2 : 1, storageState: state === "none" ? undefined : state });
const page = await context.newPage();
await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle", timeout: 180000 });
if (click) { await page.click(click); await page.waitForTimeout(400); }
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
await page.screenshot({ path: out, fullPage: flags.includes("--full") });
console.log(out, "débordement horizontal:", overflow, "px");
await browser.close();
