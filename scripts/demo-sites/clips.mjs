// Scénarios des démos : un client qui visite une boutique publique, puis la marketplace PrestAfrik Shop.
// Sites en ligne : rien n'est envoyé (le formulaire de commande est rempli, jamais validé).
export const SHOP = "https://prestafrik-shop.prestafrik.com";
export const MARKET = "https://shop.prestafrik.com";

/** @typedef {(clip: import("./recorder.mjs").Clip, page: import("@playwright/test").Page) => Promise<void>} Scenario */

/** @type {Record<string, { options?: { welcome?: boolean, popup?: boolean }, run: Scenario }>} */
export const clips = {
  /* ---------- Boutique publique : Prestafrik-Shop ---------- */
  "boutique-1-accueil": {
    options: { popup: true },
    run: async (clip, page) => {
      await clip.goto(`${SHOP}/`, 1800);
      const close = page.getByRole("button", { name: "Fermer" }).first();
      if (await close.isVisible().catch(() => false)) {
        await clip.hold(1200);
        await clip.tap(close, { after: 700 });
      }
      await clip.hold(900);
      await clip.scrollTo(page.getByText(/VENTES FLASH/i).first());
      const nextPromo = page.getByRole("button", { name: "Promotions : produits suivants" });
      if (await nextPromo.isVisible().catch(() => false)) {
        await clip.tap(nextPromo, { after: 700 });
        await clip.tap(nextPromo, { after: 700 });
      }
      await clip.scrollTo(page.getByRole("heading", { name: "Nos produits mis en avant" }));
      await clip.scrollBy(clip.mobile ? 900 : 500);
      await clip.hold(900);
      await clip.scrollTo(page.getByRole("heading", { name: "Les mieux notés" }));
      await clip.scrollTo(page.getByRole("heading", { name: "Tous nos produits" }));
      await clip.scrollBy(clip.mobile ? 900 : 500);
      await clip.hold(1200);
    },
  },
  "boutique-2-recherche": {
    run: async (clip, page) => {
      await clip.goto(`${SHOP}/`, 1200);
      const search = page.locator("input[name=q]").first();
      await clip.type(search, "dell latitude", { perFrame: 1 });
      await clip.hold(500);
      await search.press("Enter");
      await clip.waitIdle(900);
      await clip.snap(1400);
      await clip.scrollBy(clip.mobile ? 600 : 400);
      await clip.hold(1300);
    },
  },
  "boutique-3-produit-panier": {
    run: async (clip, page) => {
      await clip.goto(`${SHOP}/`, 1200);
      await clip.tap(page.locator(`main a[href="/lenovo-100w-gen-3"]`).first(), { after: 1800 });
      await clip.hold(1000);
      const nextPhoto = page.getByRole("button", { name: "Photo suivante" });
      if (await nextPhoto.isVisible().catch(() => false)) {
        await clip.tap(nextPhoto, { after: 600 });
        await clip.tap(nextPhoto, { after: 600 });
      }
      await clip.tap(page.locator("button:visible").filter({ hasText: /^\+$/ }).first(), { after: 500 });
      await clip.tap(page.getByRole("button", { name: "Ajouter au panier" }).first(), { after: 1500 });
      await clip.hold(1300);
      await clip.scrollTo(page.getByRole("heading", { name: "Avis clients" }));
      await clip.scrollTo(page.getByRole("heading", { name: "Produits similaires" }));
      await clip.hold(900);
      await clip.scrollBy(-20000, 10);
      await clip.tap(page.locator(`a[href="/panier"]`).first(), { after: 1500 });
      await clip.hold(1800);
    },
  },
  "boutique-4-commande": {
    run: async (clip, page) => {
      // Panier préparé hors champ : le film commence sur le panier.
      await page.goto(`${SHOP}/lenovo-100w-gen-3`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Ajouter au panier" }).first().click();
      await page.waitForTimeout(1200);
      await clip.goto(`${SHOP}/panier`, 1500);
      await clip.tap(page.locator("button:visible").filter({ hasText: /^\+$/ }).first(), { after: 900 });
      await clip.tap(page.locator("button:visible").filter({ hasText: /^−$/ }).first(), { after: 900 });
      const order = page.getByRole("link", { name: /commander|valider|passer/i }).or(page.getByRole("button", { name: /commander|valider|passer/i })).first();
      await clip.tap(order, { after: 1800 });
      await clip.hold(1100);
      await clip.type(page.locator("input[name=name]"), "Estelle Nkoa", { perFrame: 1 });
      await clip.type(page.locator("input[name=whatsappNational]"), "699000000", { perFrame: 1 });
      const delivery = page.locator("input[name=methodChoice]").first();
      const deliveryLabel = page.locator("label").filter({ has: delivery }).first();
      await clip.tap((await deliveryLabel.count()) ? deliveryLabel : delivery, { after: 800 });
      const zone = page.locator("select[name=zoneId]");
      if (await zone.isVisible().catch(() => false)) {
        const values = await zone.locator("option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
        await clip.tap(zone, { after: 300, action: async () => values[0] && (await zone.selectOption(values[0])) });
      }
      const landmark = page.locator("input[name=landmark]");
      if (await landmark.isVisible().catch(() => false)) await clip.type(landmark, "Près de la pharmacie du carrefour", { perFrame: 3 });
      const comment = page.locator("textarea[name=comment]");
      if (await comment.isVisible().catch(() => false)) await clip.type(comment, "Appelez-moi en arrivant", { perFrame: 3 });
      const consent = page.locator("input[name=followUpConsent]");
      if (await consent.isVisible().catch(() => false)) {
        const consentLabel = page.locator("label").filter({ has: consent }).first();
        await clip.tap((await consentLabel.count()) ? consentLabel : consent, { after: 600 });
      }
      // Démonstration : on montre le bouton « Commander », sans jamais l'envoyer.
      await clip.point(page.getByRole("button", { name: "Commander", exact: true }), 2200);
      await clip.point(page.getByRole("button", { name: "Commander sur WhatsApp" }), 2200);
    },
  },
  "boutique-5-promotions": {
    run: async (clip, page) => {
      await clip.goto(`${SHOP}/`, 1200);
      await clip.tap(page.getByRole("link", { name: "Tout voir" }).first(), { after: 1800 });
      await clip.hold(1200);
      await clip.scrollBy(clip.mobile ? 700 : 450);
      await clip.hold(900);
      await clip.scrollBy(clip.mobile ? 700 : 450);
      await clip.hold(1300);
    },
  },

  /* ---------- Marketplace : PrestAfrik Shop ---------- */
  "marketplace-1-accueil": {
    options: { welcome: true },
    run: async (clip, page) => {
      await clip.goto(`${MARKET}/`, 2000);
      await clip.tap(page.locator(".shop-welcome-choice--vente"), { after: 2200 });
      await clip.hold(1200);
      const nextSlide = page.getByRole("button", { name: "Diapositive suivante" });
      if (await nextSlide.isVisible().catch(() => false)) await clip.tap(nextSlide, { after: 1000 });
      await clip.scrollTo(page.getByRole("heading", { name: "Votre budget" }));
      await clip.scrollTo(page.getByRole("heading", { name: "Les incontournables du moment" }));
      await clip.scrollBy(clip.mobile ? 700 : 450);
      await clip.scrollTo(page.getByRole("heading", { name: "Boutiques à la une" }));
      await clip.hold(1500);
    },
  },
  "marketplace-2-univers": {
    run: async (clip, page) => {
      await clip.goto(`${MARKET}/`, 1400);
      const tab = (label) => page.locator("nav.shop-universes button").filter({ hasText: label }).first();
      await clip.tap(tab("Immobilier"), { after: 2500 });
      await clip.hold(1200);
      await clip.scrollBy(clip.mobile ? 500 : 300);
      await clip.scrollBy(-20000, 8);
      await clip.tap(tab("Services"), { after: 2500 });
      await clip.hold(1200);
      await clip.scrollTo(page.getByRole("heading", { name: /Prestataires à la une/ }));
      await clip.scrollBy(-20000, 8);
      await clip.tap(tab("Shopping"), { after: 2500 });
      await clip.hold(1500);
    },
  },
  "marketplace-3-recherche": {
    run: async (clip, page) => {
      await clip.goto(`${MARKET}/`, 1200);
      const search = page.locator("input[name=q]:visible").first();
      await clip.type(search, "robe", { perFrame: 1 });
      await clip.hold(400);
      await search.press("Enter");
      await clip.waitIdle(1000);
      await clip.snap(1400);
      const sort = page.locator(`a[href*="tri=prix-croissant"]:visible`).first();
      if (await sort.count()) await clip.tap(sort, { after: 1800 });
      const budget = page.locator(`a[href*="q=robe"][href*="max=25000"]:visible`).first();
      if (await budget.count()) await clip.tap(budget, { after: 1800 });
      await clip.scrollBy(clip.mobile ? 600 : 400);
      await clip.hold(1400);
    },
  },
  "marketplace-4-categories-budget": {
    run: async (clip, page) => {
      await clip.goto(`${MARKET}/`, 1200);
      await clip.tap(page.locator(`main a[href$="categorie=vetements-mode"]`).first(), { after: 2000 });
      await clip.hold(1200);
      await clip.scrollBy(clip.mobile ? 700 : 450);
      await clip.hold(900);
      await clip.goto(`${MARKET}/`, 900);
      const budgetLink = page.locator(`main a[href$="max=10000"]:visible`).first();
      if (!clip.mobile && (await budgetLink.count())) await clip.tap(budgetLink, { after: 2000 });
      else {
        // Téléphone : « Votre budget » est une liste déroulante.
        const select = page.locator("select:visible").filter({ has: page.locator("option", { hasText: "10 000" }) }).first();
        const label = await select.locator("option", { hasText: "10 000" }).first().textContent();
        await clip.tap(select, { after: 2200, action: () => select.selectOption({ label: label.trim() }) });
      }
      await clip.hold(1200);
      await clip.scrollBy(clip.mobile ? 600 : 400);
      await clip.hold(1300);
    },
  },
  "marketplace-5-boutique-produit": {
    run: async (clip, page) => {
      await clip.goto(`${MARKET}/`, 1200);
      await clip.scrollTo(page.getByRole("heading", { name: "Boutiques à la une" }));
      await clip.tap(page.locator(`a[href^="https://golden-needle.prestafrik.com"]`).filter({ hasText: /Golden Needle/ }).last(), { after: 2500 });
      await clip.hold(1300);
      await clip.scrollBy(clip.mobile ? 600 : 400);
      await clip.tap(page.locator(`main a[href="/robe-africaine"]`).first(), { after: 2200 });
      await clip.hold(1200);
      await clip.tap(page.getByRole("button", { name: "Ajouter au panier" }).first(), { after: 1500 });
      await clip.hold(1800);
    },
  },
  "marketplace-6-assistant": {
    run: async (clip, page) => {
      await clip.goto(`${MARKET}/`, 1200);
      await clip.tap(page.getByRole("button", { name: /assistant/i }).first(), { after: 1300 });
      await clip.hold(900);
      await clip.tap(page.getByRole("button", { name: "J’ai un petit budget" }), { after: 2200 });
      await clip.hold(1800);
      const how = page.getByRole("button", { name: "Comment commander ?" });
      if (await how.isVisible().catch(() => false)) {
        await clip.tap(how, { after: 2200 });
        await clip.hold(1800);
      }
    },
  },
};
