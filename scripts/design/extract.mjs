// Étape 0 du brief : isole chaque écran (section.board > iframe) des exports HTML
// et produit capture PNG, texte visible et HTML dans docs/design/reference/.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";

const sourceDir = resolve("PrestAfrik maquettes UX UI");
const outDir = resolve("docs/design/reference");
const pages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["Site PrestAfrik.html", "Assistant de création.html", "Espace vendeurs.html", "Boutique publique (client).html", "Administration.html", "E-mails.html"];

const slugify = (v) => v.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const browser = await chromium.launch();
const inventory = [];

for (const file of pages) {
  const pageSlug = slugify(basename(file, ".html"));
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const failed = new Set();
  page.on("response", (r) => { if (r.status() >= 400) failed.add(`${r.status()} ${r.url()}`); });
  page.on("requestfailed", (r) => failed.add(`ÉCHEC ${r.url()}`));
  await page.goto(pathToFileURL(join(sourceDir, file)).href);
  await page.waitForFunction(() => !document.getElementById("__bundler_loading"), null, { timeout: 180000 }).catch(() => {});
  await page.waitForTimeout(5000);
  const boards = await page.$$("section.board");
  for (const [index, board] of boards.entries()) {
    const title = (await board.evaluate((el) => {
      const head = [...el.children].find((c) => c.tagName !== "IFRAME" && c.innerText?.trim());
      return head ? head.innerText.trim().split("\n")[0] : `Écran ${Array.from(el.parentNode.children).indexOf(el) + 1}`;
    })) || `ecran-${index + 1}`;
    const slug = `${String(index + 1).padStart(2, "0")}-${slugify(title)}`;
    const dir = join(outDir, pageSlug, slug);
    await mkdir(dir, { recursive: true });
    const frameEl = await board.$("iframe");
    let size = null;
    if (frameEl) {
      const frame = await frameEl.contentFrame();
      await frame.waitForLoadState("load").catch(() => {});
      await frame.waitForTimeout(800);
      size = await frameEl.evaluate((el) => ({ w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }));
      const text = await frame.evaluate(() => document.body.innerText);
      const html = await frame.evaluate(() => document.documentElement.outerHTML);
      await writeFile(join(dir, "texte.txt"), text);
      await writeFile(join(dir, "ecran.html"), html);
      await frameEl.scrollIntoViewIfNeeded();
      await frameEl.screenshot({ path: join(dir, "capture.png") });
    } else {
      await board.screenshot({ path: join(dir, "capture.png") });
      await writeFile(join(dir, "texte.txt"), await board.evaluate((el) => el.innerText));
      await writeFile(join(dir, "ecran.html"), await board.evaluate((el) => el.outerHTML));
    }
    inventory.push({ page: basename(file, ".html"), title, slug: `${pageSlug}/${slug}`, size });
    console.log(`${pageSlug}/${slug}`, size);
  }
  if (failed.size) console.log("Ressources en erreur:", [...failed]);
  await page.close();
}
await writeFile(join(outDir, "inventaire.json"), JSON.stringify(inventory, null, 2));
await browser.close();
