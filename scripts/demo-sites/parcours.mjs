// Scénarios PC de la nouvelle marketplace, tournés sur l'application LOCALE (npm run dev) :
//   1. parcours-client : accueil, recherche « robe », chaque filtre, fiche produit, panier, commande ;
//   2. devenir-vendeur : marketplace → page « Devenir vendeur » → formulaire d'inscription.
//
//   node scripts/demo-sites/parcours.mjs [parcours-client|devenir-vendeur]
//
// La base locale est celle de production : rien n'est envoyé (ni commande, ni compte). Les formulaires
// sont remplis et le curseur se pose seulement sur le bouton final.
// Sortie : « extrait demo/parcours client et devenir vendeur/pc/*.gif » (+ .webp).
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Clip, launch } from "./recorder.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const output = resolve("extrait demo", "parcours client et devenir vendeur", "pc");

/** @type {Record<string, (clip: Clip, page: import("@playwright/test").Page) => Promise<void>>} */
const scenarios = {
  "parcours-client": async (clip, page) => {
    // 1. Accueil de la marketplace : on parcourt la page.
    await clip.goto(`${BASE}/`, 1800);
    await clip.scrollTo(page.getByRole("heading", { name: "Achetez par catégorie" }));
    await clip.scrollBy(550);
    await clip.hold(900);
    await clip.scrollBy(600);
    await clip.hold(900);
    await clip.scrollBy(650);
    await clip.hold(900);
    await clip.scrollBy(-20000, 12);
    await clip.hold(600);

    // 2. Recherche d'une robe depuis l'en-tête.
    const search = page.locator(".shop-header input[type=search], .shop-header input[name=q]").first();
    await clip.type(search, "robe", { perFrame: 1 });
    await clip.hold(400);
    await search.press("Enter");
    await page.waitForURL(/recherche/, { timeout: 60_000 });
    await clip.waitIdle(900);
    await clip.snap(1500);

    // 3. Filtres, un par un.
    const filters = page.locator(".sx-filters");
    await clip.tap(filters.getByRole("link", { name: /Vêtements et mode/ }).first(), { after: 1500 }); // catégorie
    await clip.hold(1100);
    await clip.tap(filters.getByRole("link", { name: "Moins de 25 000 FCFA" }), { after: 1500 }); // budget rapide
    await clip.hold(1100);
    await clip.type(filters.locator("input[name=min]"), "5000", { perFrame: 1 }); // budget précis
    const max = filters.locator("input[name=max]");
    await clip.tap(max, { after: 200 });
    await max.fill("");
    await clip.type(max, "20000", { perFrame: 1, tapFirst: false });
    await clip.tap(filters.getByRole("button", { name: "Appliquer" }), { after: 1500 });
    await clip.hold(1100);
    await clip.tap(filters.getByRole("button", { name: "Promotions seulement" }), { after: 1500 }); // promotions
    await clip.hold(1100);
    const sort = page.locator(".sx-sort select");
    await clip.tap(sort, {
      after: 1600,
      action: async () => {
        await sort.selectOption("prix-croissant"); // tri
        await page.waitForURL(/tri=prix-croissant/, { timeout: 60_000 });
      },
    });
    await clip.hold(1400);

    // 4. Fiche produit : la robe.
    await clip.tap(page.locator(`.sx-results-main a[href*="/produit/golden-needle/robe-africaine"]`).first(), { after: 1800 });
    await clip.hold(1300);
    const next = page.getByRole("button", { name: "Photo suivante" }).first();
    if (await next.isVisible().catch(() => false)) {
      await clip.tap(next, { after: 600 });
      await clip.tap(next, { after: 600 });
    }
    await clip.tap(page.getByRole("button", { name: "Ajouter un" }).first(), { after: 500 });
    await clip.tap(page.getByRole("button", { name: "Ajouter au panier" }).first(), { after: 1500 });
    await clip.hold(1000);
    const details = page.getByRole("button", { name: "Livraison et paiement" });
    if (await details.isVisible().catch(() => false)) await clip.tap(details, { after: 900 });
    await clip.hold(900);

    // 5. Panier.
    await clip.scrollBy(-20000, 8);
    await clip.tap(page.locator(`.shop-header a[href$="/panier"]`).first(), { after: 1800 });
    await clip.hold(1500);
    await clip.tap(page.getByRole("link", { name: /Commander chez/ }).first(), { after: 1800 });
    await clip.hold(1100);

    // 6. Commande : formulaire rempli, jamais envoyé.
    await clip.type(page.locator("input[name=name]"), "Estelle Nkoa", { perFrame: 1 });
    await clip.type(page.locator("input[name=whatsappNational]"), "699000000", { perFrame: 1 });
    const delivery = page.locator("input[name=methodChoice]").first();
    const deliveryLabel = page.locator("label").filter({ has: delivery }).first();
    await clip.tap((await deliveryLabel.count()) ? deliveryLabel : delivery, { after: 700 });
    const zone = page.locator("select[name=zoneId]");
    if (await zone.isVisible().catch(() => false)) {
      const values = await zone.locator("option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
      await clip.tap(zone, { after: 600, action: async () => values[0] && (await zone.selectOption(values[0])) });
    }
    const landmark = page.locator("input[name=landmark]");
    if (await landmark.isVisible().catch(() => false)) await clip.type(landmark, "Près de la pharmacie du carrefour", { perFrame: 3 });
    const comment = page.locator("textarea[name=comment]");
    if (await comment.isVisible().catch(() => false)) await clip.type(comment, "Taille M, appelez-moi en arrivant", { perFrame: 3 });
    const consent = page.locator("input[name=followUpConsent]");
    if (await consent.isVisible().catch(() => false)) {
      const consentLabel = page.locator("label").filter({ has: consent }).first();
      await clip.tap((await consentLabel.count()) ? consentLabel : consent, { after: 600 });
    }
    await clip.point(page.locator("main button[type=submit]:visible").filter({ hasText: "Commander" }).first(), 3000);
  },

  "devenir-vendeur": async (clip, page) => {
    await clip.goto(`${BASE}/`, 1800);
    await clip.tap(page.locator(".shop-header-cta").first(), { after: 2000 });
    await page.waitForURL(/\/boutique/, { timeout: 60_000 });
    await clip.waitIdle(600);
    await clip.hold(1500);
    await clip.scrollBy(600);
    await clip.hold(1000);
    await clip.scrollBy(650);
    await clip.hold(1000);
    await clip.scrollBy(-20000, 8);
    await clip.tap(page.getByRole("link", { name: "Créer ma boutique" }).first(), { after: 2000 });
    await page.waitForURL(/inscription/, { timeout: 60_000 });
    await clip.waitIdle(600);
    await clip.hold(1300);
    await clip.type(page.locator("input[name=name]"), "Awa Ngono", { perFrame: 1 });
    await clip.type(page.locator("input[name=email]"), "awa.ngono@exemple.com", { perFrame: 2 });
    await clip.type(page.locator("input[name=phoneNational]"), "699000000", { perFrame: 1 });
    await clip.type(page.locator("input[name=password]"), "MaBoutique2026", { perFrame: 2 });
    const terms = page.locator("input[name=terms]");
    const termsLabel = page.locator("label").filter({ has: terms }).first();
    await clip.tap((await termsLabel.count()) ? termsLabel : terms, { after: 600 });
    await clip.point(page.getByRole("button", { name: "Créer mon compte" }), 3000);
  },
};

const names = process.argv.slice(2);
let failed = 0;
await mkdir(output, { recursive: true });
for (const [name, run] of Object.entries(scenarios)) {
  if (names.length && !names.includes(name)) continue;
  const { browser, context, page, device } = await launch("pc");
  await context.addCookies([{ name: "shop_univers", value: "vente", url: BASE }]);
  try {
    const clip = new Clip(page, device, name);
    await run(clip, page);
    await clip.save(output);
  } catch (error) {
    failed++;
    console.error(`✗ pc/${name} : ${error.message.split("\n").slice(0, 3).join(" / ")}`);
    await page.screenshot({ path: resolve(output, `echec-${name}.png`) }).catch(() => {});
  } finally {
    await browser.close();
  }
}
process.exit(failed ? 1 : 0);
