// Scénarios des films du guide : chaque geste est celui qu'un vendeur fait sur son téléphone.
// Les films « creer-boutique-* » créent une boutique : lancez-les avec un autre compte de démonstration
// (GUIDE_EMAIL=vendeur5@example.test), pour que les autres films restent sur « Mboa Style ».
import sharp from "sharp";

/** Photo d'exemple (même style que les produits de démonstration). */
async function samplePhoto(label, color) {
  const initials = label.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <rect width="800" height="800" fill="#fff"/><rect width="800" height="800" fill="${color}" opacity="0.18"/>
    <circle cx="400" cy="360" r="190" fill="${color}" opacity="0.35"/>
    <text x="400" y="420" font-family="Arial" font-size="180" font-weight="700" text-anchor="middle" fill="${color}">${initials}</text>
    <text x="400" y="700" font-family="Arial" font-size="38" text-anchor="middle" fill="#53645B">Photo d’exemple</text>
  </svg>`;
  return { name: "photo.jpg", mimeType: "image/jpeg", buffer: await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer() };
}

const next = (page) => page.getByRole("button", { name: "Continuer", exact: true });

/** @type {Record<string, (clip: import("./recorder.mjs").Clip, page: import("@playwright/test").Page) => Promise<void>>} */
export const clips = {
  /* ---------- Créer sa boutique (assistant en 9 étapes) ---------- */
  "creer-boutique-1": async (clip, page) => {
    await clip.goto("/boutiques/nouvelle?nouvelle=1", 1500);
    await clip.type(page.locator("input[name=name]"), process.env.GUIDE_STORE_NAME ?? "Mama Ngo Couture", { perFrame: 1 });
    await clip.hold(900);
    await clip.tap(next(page), { after: 2200 });
    await clip.hold(900);
    await clip.tap(page.locator(".variable-chips button").first(), { after: 500 });
    await clip.type(page.locator("textarea[name=description]"), "Pagnes, robes et accessoires faits main. Livraison rapide.", { perFrame: 4 });
    await clip.tap(next(page), { after: 2200 });
    await clip.hold(900);
  },
  "creer-boutique-2": async (clip, page) => {
    await clip.goto("/boutiques/nouvelle", 1200);
    await clip.tap(page.getByRole("button", { name: /^Région/ }), { after: 500 });
    await clip.tap(page.getByRole("option").filter({ hasText: "Littoral" }).first(), { after: 500 });
    await clip.tap(page.getByRole("button", { name: /^Ville/ }), { after: 500 });
    await clip.tap(page.getByRole("option").filter({ hasText: "Douala" }).first(), { after: 500 });
    await clip.type(page.locator("input[name=neighborhood]"), "Akwa", { perFrame: 1 });
    await clip.tap(next(page), { after: 2200 });
    await clip.hold(900);
    const phone = page.locator("input[name='phone.national'], input[name=phoneNational], input[name=phone]").first();
    await phone.fill("");
    await clip.type(phone, "699123456", { perFrame: 1 });
    await clip.tap(next(page), { after: 2200 });
    await clip.hold(1200);
  },
  "creer-boutique-3": async (clip, page) => {
    await clip.goto("/boutiques/nouvelle", 1200);
    await clip.tap(page.locator(".wizard-theme").nth(1), { after: 1200 });
    await clip.hold(900);
    await clip.tap(page.locator(".wizard-theme").nth(3), { after: 1200 });
    await clip.hold(900);
    await clip.tap(next(page), { after: 2200 });
    await clip.hold(1000);
    await clip.scrollBy(320);
    await clip.hold(1200);
    await clip.tap(next(page), { after: 2200 });
    await clip.hold(900);
  },
  "creer-boutique-4": async (clip, page) => {
    await clip.goto("/boutiques/nouvelle", 1200);
    await clip.type(page.locator("input[name=productName]"), "Robe wax Akwa", { perFrame: 1 });
    await clip.type(page.locator("input[name=productPrice]"), "18000", { perFrame: 1 });
    const file = page.locator("input[type=file]").first();
    if (await file.count()) {
      await file.setInputFiles(await samplePhoto("Robe wax", "#FF9900"));
      await photoReady(page);
      await clip.snap(900);
    }
    await clip.tap(next(page), { after: 2200 });
    await clip.hold(1100);
    await clip.scrollBy(300);
    await clip.hold(900);
    await clip.tap(next(page), { after: 2200 });
    await clip.hold(1200);
    await clip.scrollBy(400);
    await clip.hold(900);
    const publish = page.getByRole("button", { name: /Créer et publier ma boutique|Créer ma boutique/ });
    // Boutique créée : le tableau de bord s'ouvre avec la fenêtre « Félicitations ».
    await clip.tap(publish, { after: 6000 });
    await page.waitForURL(/\/dashboard/, { timeout: 120_000 }).catch(() => {});
    await page.locator(".launch").waitFor({ timeout: 60_000 }).catch(() => {});
    await clip.settle(1200, 3200);
  },

  /* ---------- Tableau de bord ---------- */
  "tableau-de-bord": async (clip, page) => {
    await clip.goto("/dashboard", 1600);
    const periods = page.getByRole("navigation", { name: "Période" });
    await clip.tap(periods.getByRole("link", { name: "30 jours" }), { after: 1500 });
    await clip.hold(900);
    await clip.scrollBy(380);
    await clip.hold(1200);
    await clip.scrollBy(520);
    await clip.hold(1100);
    await clip.scrollBy(700);
    await clip.hold(1300);
  },
  menu: async (clip, page) => {
    await clip.goto("/dashboard", 1200);
    // Barre du bas : Accueil, Commandes, Produits, Ma boutique, puis « Menu » pour les autres rubriques.
    await clip.tap(page.locator(".vendor-tabbar").getByRole("link", { name: "Commandes" }), { after: 1800 });
    await clip.hold(1000);
    await clip.tap(page.locator(".vendor-tabbar").getByRole("link", { name: "Produits" }), { after: 1800 });
    await clip.hold(1000);
    await clip.tap(page.locator(".vendor-tabbar button"), { after: 700 });
    await clip.hold(1800);
    await clip.tap(page.locator(".vendor-drawer-nav").getByRole("link", { name: "Avis clients" }), { after: 2000 });
    await clip.hold(1400);
  },
  partager: async (clip, page) => {
    await clip.goto("/dashboard", 1200);
    await clip.tap(page.getByRole("button", { name: "Partager" }).first(), { after: 900 });
    await clip.hold(2600);
  },

  /* ---------- Produits ---------- */
  "ajouter-produit": async (clip, page) => {
    await clip.goto("/dashboard/produits", 1300);
    await clip.tap(page.getByRole("link", { name: /Ajouter un produit/ }).first(), { after: 2000 });
    await clip.hold(800);
    await clip.type(page.locator("input[name=name]"), "Boubou brodé", { perFrame: 1 });
    const editor = page.locator("[contenteditable=true]").first();
    if (await editor.count()) await clip.type(editor, "Boubou en coton, broderie faite main. Taille unique.", { perFrame: 5 });
    else await clip.type(page.locator("textarea[name=description]"), "Boubou en coton, broderie faite main. Taille unique.", { perFrame: 5 });
    const category = page.locator("select[name=categoryId]");
    await clip.tap(category, { action: async () => category.selectOption({ index: 2 }), after: 400 });
    await clip.hold(700);
    await clip.scrollTo(page.getByText("Glissez vos photos ici"));
    await page.locator("input[type=file]").first().setInputFiles(await samplePhoto("Boubou brodé", "#7A4BC2"));
    await photoReady(page);
    await clip.snap(1200);
    await clip.type(page.locator("input[name=priceXaf]"), "25000", { perFrame: 1 });
    await clip.type(page.locator("input[name=promotionalPriceXaf]"), "21000", { perFrame: 1 });
    await clip.hold(700);
    await clip.tap(page.getByRole("button", { name: /Enregistrer le produit/ }).first(), { after: 3500 });
    await clip.settle(800, 2200);
  },
  "gerer-produits": async (clip, page) => {
    await clip.goto("/dashboard/produits", 1500);
    await clip.scrollBy(260);
    await clip.hold(800);
    const star = page.getByRole("button", { name: /^Mettre en avant/ }).first();
    if (await star.count()) {
      await clip.tap(star, { after: 1500 });
      await clip.hold(1500);
    }
    await clip.tap(page.getByRole("button", { name: /^Plus d’actions pour/ }).first(), { after: 600 });
    await clip.hold(1800);
    await clip.tap(page.getByRole("menuitem", { name: "Modifier" }).first(), { after: 2200 });
    await clip.hold(1000);
    await clip.scrollBy(900);
    await clip.hold(1000);
    await clip.scrollBy(1100);
    await clip.hold(1400);
  },

  /* ---------- Commandes ---------- */
  commandes: async (clip, page) => {
    await clip.goto("/dashboard/commandes", 1500);
    await clip.tap(page.getByRole("link", { name: /^Nouvelles/ }), { after: 1800 });
    await clip.hold(1000);
    await clip.moveTo(...(await center(page.getByRole("link", { name: /Continuer sur WhatsApp/ }).first())));
    await clip.hold(1500);
    await clip.tap(page.locator(".v-ref").first(), { after: 2200 });
    await clip.hold(1200);
    await clip.scrollBy(450);
    await clip.hold(1100);
    await clip.scrollBy(-450);
    await clip.tap(page.getByRole("button", { name: /^Marquer la commande .* validée/ }).first(), { after: 3000 });
    await clip.settle(600, 2400);
  },

  /* ---------- Avis clients ---------- */
  "avis-client": async (clip, page) => {
    await clip.goto("/mboa-style", 1300);
    await clip.tap(page.locator(".sf-card-link").first(), { after: 2500 });
    await clip.hold(800);
    await clip.scrollTo(page.getByRole("heading", { name: "Avis clients" }));
    await clip.hold(1000);
    await clip.tap(page.getByRole("button", { name: "Donner mon avis" }), { after: 600 });
    await clip.tap(page.getByRole("button", { name: /^5 étoiles/ }), { after: 400 });
    await clip.type(page.locator("input[name=authorName]"), "Estelle", { perFrame: 1 });
    await clip.type(page.locator("textarea[name=comment]"), "Tissu de belle qualité, livrée en 24 h à Akwa. Merci !", { perFrame: 4 });
    await clip.tap(page.getByRole("button", { name: "Publier mon avis" }), { after: 2500 });
    await clip.settle(500, 2200);
  },
  "avis-vendeur": async (clip) => {
    await clip.goto("/dashboard/avis", 1800);
    await clip.scrollBy(380);
    await clip.hold(1500);
    await clip.scrollBy(500);
    await clip.hold(1300);
    await clip.scrollBy(-880);
    await clip.hold(1200);
  },

  /* ---------- Livraisons, clients, argent ---------- */
  livraisons: async (clip, page) => {
    await clip.goto("/dashboard/livraisons", 1300);
    await clip.tap(page.getByRole("button", { name: "+ Ajouter une zone" }), { after: 800 });
    const dialog = page.getByRole("dialog");
    await clip.type(dialog.locator("input[name=name]"), "Bonamoussadi", { perFrame: 1 });
    const city = dialog.locator("select[name=city]");
    await clip.tap(city, { action: async () => city.selectOption("Douala"), after: 400 });
    await clip.type(dialog.locator("input[name=fee]"), "1500", { perFrame: 1 });
    await clip.type(dialog.locator("input[name=estimatedDelay]"), "24 h", { perFrame: 1 });
    await clip.tap(dialog.getByRole("button", { name: "Ajouter la zone" }), { after: 2200 });
    await clip.settle(500, 2200);
  },
  clients: async (clip, page) => {
    await clip.goto("/dashboard/clients", 1400);
    await clip.tap(page.getByRole("navigation", { name: "Segments de clients" }).getByRole("link").nth(1), { after: 1800 });
    await clip.hold(1000);
    await clip.tap(page.locator("a[href^='/dashboard/clients/c'], a[href*='/dashboard/clients/']:not([href$='nouveau'])").first(), { after: 2200 });
    await clip.hold(1200);
    await clip.scrollBy(500);
    await clip.hold(1300);
  },
  argent: async (clip, page) => {
    await clip.goto("/dashboard/argent", 1500);
    await clip.tap(page.locator(".period-filter summary"), { after: 600 });
    await clip.hold(1300);
    await clip.tap(page.locator(".period-filter-panel a").filter({ hasText: /Mois en cours|30/ }).first(), { after: 2000 });
    await clip.hold(1200);
    await clip.scrollBy(400);
    await clip.hold(1400);
  },

  /* ---------- Ma boutique, marketing, équipe ---------- */
  "ma-boutique": async (clip, page) => {
    await clip.goto("/dashboard/boutique", 1300);
    // Thème de la boutique (section « Apparence »), puis l'aperçu en entier : le changement s'y voit avant d'enregistrer.
    const preview = page.getByRole("heading", { name: "Aperçu avant publication" });
    await scrollToTop(clip, page, preview);
    await clip.hold(1500);
    const themes = page.locator("#apparence .theme-tiles").first().locator("label.theme-tile");
    await scrollToTop(clip, page, page.locator("#apparence"));
    await clip.hold(700);
    await clip.tap(themes.nth(2), { after: 900 });
    await clip.hold(700);
    await scrollToTop(clip, page, preview);
    await page.waitForTimeout(1800);
    await clip.hold(2200);
  },
  marketing: async (clip, page) => {
    await clip.goto("/dashboard/marketing", 1200);
    await clip.tap(page.getByRole("link", { name: /Bannière/ }), { after: 2200 });
    await clip.hold(1300);
    await clip.scrollBy(500);
    await clip.hold(1200);
    await clip.goto("/dashboard/marketing", 900);
    // Popups plutôt que Campagnes : sur la base de démonstration, l'API WhatsApp n'est pas configurée (alerte rouge).
    await clip.tap(page.getByRole("link", { name: /Popups/ }), { after: 2200 });
    await clip.hold(1300);
    await clip.scrollBy(450);
    await clip.hold(1400);
  },
  equipe: async (clip, page) => {
    await clip.goto("/dashboard/equipe", 1300);
    await clip.scrollTo(page.getByRole("heading", { name: "Inviter une personne" }));
    await clip.hold(800);
    const emailField = page.locator("input[type=email]").first();
    await clip.type(emailField, "nadine@exemple.cm", { perFrame: 2 });
    await clip.hold(900);
    await clip.scrollTo(page.getByRole("heading", { name: "Membres" }));
    await clip.hold(1400);
  },
};

async function center(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  return [box.x + box.width / 2, box.y + box.height / 2];
}

/** Attend que la photo envoyée s'affiche en miniature (et non « Envoi en cours… »). */
async function photoReady(page) {
  await page.locator(".photo-tile.is-ready img").first().waitFor({ timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(600);
}

/** Défilement filmé qui amène l'élément en haut de l'écran, juste sous l'en-tête. */
async function scrollToTop(clip, page, locator) {
  await locator.first().waitFor({ timeout: 60_000 });
  const top = await locator.first().evaluate((element) => element.getBoundingClientRect().top);
  await clip.scrollBy(top - 70);
}
