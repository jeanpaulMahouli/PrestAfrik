// Films du guide vendeur (/aide/guide), tournés sur la base de DÉMONSTRATION locale uniquement.
//
//   node scripts/local-db.mjs                     (autre terminal)
//   DATABASE_URL=…/prestafrik_guide npx next dev -p 3100   (seed de démonstration chargé)
//   node scripts/guide/capture.mjs [nom-du-film …]
//
// Chaque film est écrit dans public/guide/<nom>.webp et ses réglages (barre d'état) dans
// src/components/guide/clips.json. Ne jamais lancer contre la base de .env : les films créent des données.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Clip, launch } from "./recorder.mjs";
import { clips } from "./clips.mjs";

const baseURL = process.env.GUIDE_BASE_URL ?? "http://localhost:3100";
const email = process.env.GUIDE_EMAIL ?? "vendeur1@example.test";
const password = process.env.SEED_DEMO_PASSWORD ?? "Demo-PrestAfrik-2026";
const only = process.argv.slice(2);
const metaFile = resolve("src/components/guide/clips.json");

async function signIn(context) {
  const page = await context.newPage();
  await page.goto("/connexion?next=/dashboard", { timeout: 180_000 });
  const button = page.getByRole("button", { name: "Me connecter" });
  for (let i = 0; i < 90 && !(await button.isEnabled()); i++) {
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.locator("input[name=password]").fill(password);
    await page.waitForTimeout(1000);
  }
  await button.click();
  await page.waitForURL((url) => !url.pathname.startsWith("/connexion"), { timeout: 180_000 });
  await page.close();
}

const { browser, context } = await launch({ baseURL });
await signIn(context);

// Préchauffage : chaque page est compilée une fois avant le tournage (sinon « Chargement en cours… »).
{
  const page = await context.newPage();
  const warm = ["/dashboard", "/dashboard/produits", "/dashboard/produits/nouveau", "/dashboard/commandes", "/dashboard/avis", "/dashboard/livraisons", "/dashboard/clients", "/dashboard/argent", "/dashboard/boutique", "/dashboard/marketing", "/dashboard/marketing/banniere", "/dashboard/marketing/campagnes", "/dashboard/equipe", "/boutiques/nouvelle", "/mboa-style"];
  for (const path of warm) await page.goto(path, { timeout: 240_000 }).catch(() => {});
  for (const selector of ["a[href^='/dashboard/produits/c']", ".v-ref", "a[href^='/dashboard/clients/c']"]) {
    const base = selector === ".v-ref" ? "/dashboard/commandes" : selector.includes("clients") ? "/dashboard/clients" : "/dashboard/produits";
    await page.goto(base).catch(() => {});
    const href = await page.locator(selector).first().getAttribute("href").catch(() => null);
    if (href) await page.goto(href, { timeout: 240_000 }).catch(() => {});
  }
  await page.close();
}
const meta = JSON.parse(await readFile(metaFile, "utf8").catch(() => "{}"));
try {
  for (const [name, film] of Object.entries(clips)) {
    if (only.length && !only.includes(name)) continue;
    const page = await context.newPage();
    const clip = new Clip(page, name);
    try {
      await film(clip, page);
      const result = await clip.save();
      meta[name] = { statusBar: result.statusBar, dark: result.dark, duration: result.duration };
    } catch (error) {
      console.error(`✗ ${name} :`, error.message);
      await page.screenshot({ path: resolve(`storage/guide-error-${name}.png`) }).catch(() => {});
    } finally {
      await page.close();
    }
  }
} finally {
  await writeFile(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
  await browser.close();
}
