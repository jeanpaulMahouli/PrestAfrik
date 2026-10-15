// Planche de comparaison maquette / application (brief §0.2 point 11).
// Usage : node scripts/design/compare.mjs <route> <reference-slug> [--width=1280] [--state=fichier.json] [--full]
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

const [route, referenceSlug, ...flags] = process.argv.slice(2);
const option = (name, fallback) => flags.find((f) => f.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const width = Number(option("width", referenceSlug.startsWith("boutique-publique") ? 390 : 1280));
const state = option("state", undefined);
const base = option("base", "http://localhost:3000");
const reference = join("docs/design/reference", referenceSlug, "capture.png");
const refMeta = await sharp(reference).metadata();
const height = Math.round(refMeta.height / (refMeta.width / width));
const scale = width <= 400 ? 2 : 1;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, storageState: state });
const page = await context.newPage();
await page.goto(base + route, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(600);
const app = await page.screenshot({ fullPage: flags.includes("--full") });
await browser.close();

const target = join("docs/design/comparaison", `${referenceSlug}.png`);
await mkdir(dirname(target), { recursive: true });
const h = Math.max(height * scale, (await sharp(app).metadata()).height);
const left = await sharp(reference).resize({ width: width * scale }).toBuffer();
const leftMeta = await sharp(left).metadata();
const gap = 24;
await sharp({ create: { width: width * scale * 2 + gap, height: Math.max(h, leftMeta.height), channels: 3, background: "#888" } })
  .composite([{ input: left, left: 0, top: 0 }, { input: app, left: width * scale + gap, top: 0 }])
  .png()
  .toFile(target);
console.log(target);
