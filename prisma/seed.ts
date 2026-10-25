// Seed de démonstration déterministe et relançable (brief §11.6).
// 5 boutiques, 10 membres (+ 1 administrateur), 60 produits avec variantes et photos d'exemple,
// 100 clients, 180 commandes couvrant tous les cas, livraisons, paiements, messages simulés.
//
// Garde-fous : refuse la production, exige ALLOW_DEMO_SEED=true et, par défaut, une base locale.
// Aucune adresse ni numéro réel : e-mails en example.test ; aucun envoi n'est déclenché.
import {
  ConsentType,
  OrderProcessingStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  PlatformRole,
  Prisma,
  PrismaClient,
  ProductAvailability,
  StoreRole,
  StoreTheme,
  SubscriptionPeriod,
  SubscriptionStatus,
} from "@prisma/client";
import { createHash } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

const prisma = new PrismaClient();
const uploadsRoot = resolve(process.env.UPLOADS_DIR || join(process.cwd(), "storage", "uploads"));
const day = 24 * 60 * 60 * 1000;
const now = new Date();

// Générateur pseudo-aléatoire déterministe (mulberry32).
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stableUuid(...parts: (string | number)[]) {
  const hex = createHash("sha256").update(parts.join(":")).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const slugify = (value: string) =>
  value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type ProductSeed = { name: string; category: string; price: number; promo?: number; variants?: [string, string[]]; stock?: number; availability?: ProductAvailability; featured?: boolean };

const catalogs: Record<string, ProductSeed[]> = {
  "mboa-style": [
    { name: "Robe wax Akwa", category: "Robes", price: 18000, variants: ["Taille", ["S", "M", "L", "XL"]], featured: true },
    { name: "Ensemble pagne", category: "Ensembles", price: 27000, featured: true },
    { name: "Sac en raphia", category: "Sacs", price: 9500, stock: 12 },
    { name: "Chemise brodée", category: "Chemises", price: 15000, variants: ["Taille", ["M", "L", "XL"]] },
    { name: "Jupe portefeuille", category: "Robes", price: 12000, promo: 9900 },
    { name: "Boubou homme", category: "Ensembles", price: 32000 },
    { name: "Foulard kente", category: "Accessoires", price: 4500, stock: 0, availability: ProductAvailability.SOLD_OUT },
    { name: "Robe de soirée Bonanjo", category: "Robes", price: 45000, availability: ProductAvailability.PREORDER },
    { name: "Pochette perlée", category: "Sacs", price: 7500, stock: 3 },
    { name: "Chemise lin Deido", category: "Chemises", price: 16500 },
    { name: "Ensemble enfant", category: "Ensembles", price: 11000, variants: ["Âge", ["2 ans", "4 ans", "6 ans"]] },
    { name: "Turban assorti", category: "Accessoires", price: 3500 },
  ],
  "douala-maison": [
    { name: "Coussin bogolan", category: "Décoration", price: 8500, featured: true },
    { name: "Panier tressé", category: "Rangement", price: 6500, stock: 20 },
    { name: "Nappe en pagne", category: "Linge de maison", price: 14000, variants: ["Format", ["4 places", "6 places", "8 places"]] },
    { name: "Lampe en calebasse", category: "Décoration", price: 22000, featured: true },
    { name: "Set de 6 verres", category: "Cuisine", price: 9000 },
    { name: "Plateau en bois", category: "Cuisine", price: 12500, promo: 10500 },
    { name: "Rideau imprimé", category: "Linge de maison", price: 18000 },
    { name: "Miroir rotin", category: "Décoration", price: 26000, availability: ProductAvailability.PREORDER },
    { name: "Boîte à épices", category: "Cuisine", price: 5500, stock: 0, availability: ProductAvailability.SOLD_OUT },
    { name: "Tapis tissé", category: "Décoration", price: 35000 },
    { name: "Torchons wax (lot de 3)", category: "Linge de maison", price: 4500 },
    { name: "Corbeille à fruits", category: "Rangement", price: 7000 },
  ],
  "yaounde-beaute": [
    { name: "Beurre de karité pur", category: "Soins du corps", price: 4500, featured: true, stock: 40 },
    { name: "Huile de coco vierge", category: "Cheveux", price: 3500, variants: ["Contenance", ["100 ml", "250 ml"]] },
    { name: "Savon noir africain", category: "Soins du corps", price: 2500 },
    { name: "Masque à l’argile", category: "Visage", price: 6000, promo: 5000 },
    { name: "Sérum éclat", category: "Visage", price: 12000, featured: true },
    { name: "Perruque naturelle", category: "Cheveux", price: 65000, availability: ProductAvailability.PREORDER },
    { name: "Gommage au café", category: "Soins du corps", price: 5500 },
    { name: "Baume à lèvres", category: "Visage", price: 1500, stock: 0, availability: ProductAvailability.SOLD_OUT },
    { name: "Coffret découverte", category: "Coffrets", price: 15000 },
    { name: "Huile de ricin", category: "Cheveux", price: 4000 },
    { name: "Crème mains moringa", category: "Soins du corps", price: 3500 },
    { name: "Coffret mariée", category: "Coffrets", price: 28000 },
  ],
  "bafoussam-creations": [
    { name: "Masque bamiléké", category: "Sculpture", price: 40000, featured: true },
    { name: "Tabouret sculpté", category: "Mobilier", price: 55000 },
    { name: "Bracelet en perles", category: "Bijoux", price: 3500, variants: ["Couleur", ["Rouge", "Bleu", "Multicolore"]] },
    { name: "Statuette en bronze", category: "Sculpture", price: 75000, availability: ProductAvailability.PREORDER },
    { name: "Collier ndop", category: "Bijoux", price: 8000, featured: true },
    { name: "Tenture ndop", category: "Textile", price: 30000 },
    { name: "Calebasse décorée", category: "Sculpture", price: 12000, promo: 9500 },
    { name: "Boucles d’oreilles laiton", category: "Bijoux", price: 4500, stock: 0, availability: ProductAvailability.SOLD_OUT },
    { name: "Chapeau tressé", category: "Textile", price: 9000 },
    { name: "Plat en terre cuite", category: "Mobilier", price: 14000 },
    { name: "Porte-clés sculpté", category: "Bijoux", price: 1500, stock: 50 },
    { name: "Coffret cadeau artisan", category: "Textile", price: 25000 },
  ],
  "kribi-accessoires": [
    { name: "Lunettes de soleil Kribi", category: "Lunettes", price: 8000, featured: true },
    { name: "Montre bracelet cuir", category: "Montres", price: 22000, variants: ["Couleur", ["Marron", "Noir"]] },
    { name: "Ceinture tressée", category: "Ceintures", price: 6500 },
    { name: "Casquette brodée", category: "Chapeaux", price: 5000, promo: 4000 },
    { name: "Sandales en cuir", category: "Chaussures", price: 15000, variants: ["Pointure", ["39", "40", "41", "42", "43"]], featured: true },
    { name: "Portefeuille homme", category: "Ceintures", price: 9500 },
    { name: "Bob de plage", category: "Chapeaux", price: 4500 },
    { name: "Montre sport", category: "Montres", price: 18000, stock: 0, availability: ProductAvailability.SOLD_OUT },
    { name: "Lunettes rondes", category: "Lunettes", price: 7500 },
    { name: "Espadrilles wax", category: "Chaussures", price: 12000 },
    { name: "Bracelet coquillages", category: "Ceintures", price: 2500, stock: 30 },
    { name: "Sac de plage", category: "Chapeaux", price: 11000, availability: ProductAvailability.PREORDER },
  ],
};

const demoStores = [
  { slug: "mboa-style", name: "Mboa Style", prefix: "MB", city: "Douala", category: "Vêtements et mode", theme: StoreTheme.MODE_BEAUTE, colors: ["#FF9900", "#000026", "#EF765E"], subscription: "TRIAL_ACTIVE" },
  { slug: "douala-maison", name: "Douala Maison", prefix: "DM", city: "Douala", category: "Maison et décoration", theme: StoreTheme.BOUTIQUE_MARQUE, colors: ["#176B52", "#17251F", "#F4B942"], subscription: "MONTHLY" },
  { slug: "yaounde-beaute", name: "Yaoundé Beauté", prefix: "YB", city: "Yaoundé", category: "Beauté et cosmétiques", theme: StoreTheme.MODE_BEAUTE, colors: ["#C2185B", "#2D0A1F", "#F4B942"], subscription: "YEARLY" },
  { slug: "bafoussam-creations", name: "Bafoussam Créations", prefix: "BC", city: "Bafoussam", category: "Artisanat", theme: StoreTheme.CATALOGUE_EXPRESS, colors: ["#8D4E1F", "#1F140C", "#EF765E"], subscription: "TRIAL_EXPIRED" },
  { slug: "kribi-accessoires", name: "Kribi Accessoires", prefix: "KA", city: "Kribi", category: "Accessoires", theme: StoreTheme.CATALOGUE_EXPRESS, colors: ["#0B6E99", "#00213A", "#FF9900"], subscription: "EXPIRED" },
] as const;

const team = [
  ["Awa Ngono", "Samuel Nkoulo"],
  ["Brice Tamo", "Nadine Essomba"],
  ["Sandra Mvondo", "Junior Kamga"],
  ["Flore Ngassa", "Idriss Abega"],
  ["Mireille Foko", "Kevin Muna"],
] as const;

const firstNames = ["Estelle", "Brice", "Sandra", "Idriss", "Flore", "Carine", "Hervé", "Laure", "Patrick", "Christelle", "Blaise", "Mireille", "Arnaud", "Nadège", "Serge", "Prisca", "Franck", "Odile", "Yannick", "Grâce"];
const lastNames = ["Nkoa", "Tamo", "Mvondo", "Abega", "Ngassa", "Fotso", "Eboa", "Mbarga", "Tchoua", "Ndzana", "Kouam", "Owona", "Djeumo", "Essama", "Bella", "Nana", "Atangana", "Moukoko", "Simo", "Ewane"];
const neighborhoods: Record<string, string[]> = {
  Douala: ["Akwa", "Bonapriso", "Deido", "Bonamoussadi", "Makepe", "Bali"],
  Yaoundé: ["Bastos", "Essos", "Mvan", "Biyem-Assi", "Nlongkak", "Omnisport"],
  Bafoussam: ["Tamdja", "Kamkop", "Djeleng", "Banengo"],
  Kribi: ["Mpangou", "Dombé", "Ngoyè", "Talla"],
};
const landmarks = ["Près de la pharmacie", "Face au marché", "Derrière l’école publique", "À côté de la boulangerie", "Entrée de la station-service", "Carrefour principal"];

// Cycle de commande simplifié (ADR-013) : nouvelle, validée (argent reçu) ou annulée.
const scenarios: { stage: "NEW" | "VALIDATED" | "CANCELLED"; pickup?: boolean; cancelledAfterValidation?: boolean }[] = [
  { stage: "NEW" },
  { stage: "VALIDATED" },
  { stage: "NEW" },
  { stage: "VALIDATED" },
  { stage: "VALIDATED", pickup: true },
  { stage: "CANCELLED" },
  { stage: "VALIDATED" },
  { stage: "NEW", pickup: true },
  { stage: "VALIDATED" },
  { stage: "CANCELLED", cancelledAfterValidation: true },
  { stage: "VALIDATED" },
];

async function placeholderImage(storeId: string, key: string, label: string, color: string) {
  const filename = `${stableUuid("img", storeId, key)}.webp`;
  const directory = join(uploadsRoot, storeId);
  await mkdir(directory, { recursive: true });
  const initials = label.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <rect width="800" height="800" fill="${color}" opacity="0.18"/>
    <circle cx="400" cy="360" r="190" fill="${color}" opacity="0.35"/>
    <text x="400" y="420" font-family="Arial" font-size="180" font-weight="700" text-anchor="middle" fill="${color}">${initials}</text>
    <text x="400" y="700" font-family="Arial" font-size="38" text-anchor="middle" fill="#53645B">Photo d’exemple</text>
  </svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(join(directory, filename));
  return `/media/${storeId}/${filename}`;
}

/** Visuel d'exemple au format voulu (bannière 1920×1080, popup 1080×1350). */
async function placeholderVisual(storeId: string, key: string, title: string, subtitle: string, color: string, width: number, height: number) {
  const filename = `${stableUuid("visual", storeId, key)}.webp`;
  const directory = join(uploadsRoot, storeId);
  await mkdir(directory, { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#000026"/></linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>
    <circle cx="${width * 0.82}" cy="${height * 0.25}" r="${Math.min(width, height) * 0.28}" fill="#ffffff" opacity="0.12"/>
    <text x="${width * 0.08}" y="${height * 0.48}" font-family="Arial" font-size="${Math.round(width / 14)}" font-weight="700" fill="#ffffff">${title}</text>
    <text x="${width * 0.08}" y="${height * 0.62}" font-family="Arial" font-size="${Math.round(width / 32)}" fill="#ffffff" opacity="0.9">${subtitle}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(join(directory, filename));
  return `/media/${storeId}/${filename}`;
}

function assertSafeTarget() {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Le seed contient uniquement des données fictives. Définissez ALLOW_DEMO_SEED=true hors production.");
  }
  const url = process.env.DATABASE_URL ?? "";
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  if (!isLocal && process.env.ALLOW_REMOTE_DEMO_SEED !== "true") {
    throw new Error(
      "Le seed refuse une base distante (elle peut contenir de vrais comptes). Utilisez la base locale (npm run db:local) ou définissez ALLOW_REMOTE_DEMO_SEED=true en connaissance de cause.",
    );
  }
  return isLocal;
}

async function demoPasswordAccount(userId: string, isLocal: boolean) {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || !isLocal) return;
  const { hashPassword } = await import("better-auth/crypto");
  const hash = await hashPassword(password);
  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: userId } },
    update: { password: hash },
    create: { userId, providerId: "credential", accountId: userId, password: hash },
  });
}

async function resetStore(slug: string) {
  const existing = await prisma.store.findUnique({ where: { slug }, select: { id: true } });
  if (!existing) return;
  await prisma.payment.deleteMany({ where: { storeId: existing.id } });
  await prisma.store.delete({ where: { id: existing.id } });
  await rm(join(uploadsRoot, existing.id), { recursive: true, force: true });
  await rm(join(uploadsRoot, "stores", existing.id), { recursive: true, force: true });
}

async function main() {
  const isLocal = assertSafeTarget();
  const plans = Object.fromEntries((await prisma.plan.findMany()).map((plan) => [plan.code, plan]));
  if (!plans.BUSINESS) throw new Error("Les offres ne sont pas initialisées : appliquez d’abord les migrations.");

  const admin = await prisma.user.upsert({
    where: { email: "admin@prestafrik.example.test" },
    update: { platformRole: PlatformRole.SUPER_ADMIN, emailVerified: true },
    create: { email: "admin@prestafrik.example.test", name: "Admin PrestAfrik", platformRole: PlatformRole.SUPER_ADMIN, emailVerified: true },
  });
  await demoPasswordAccount(admin.id, isLocal);

  let customerTotal = 0;
  let orderTotal = 0;

  for (const [storeIndex, demo] of demoStores.entries()) {
    const rand = random(1000 + storeIndex);
    const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
    await resetStore(demo.slug);

    const owner = await prisma.user.upsert({
      where: { email: `vendeur${storeIndex + 1}@example.test` },
      update: { name: team[storeIndex][0], emailVerified: true },
      create: { email: `vendeur${storeIndex + 1}@example.test`, name: team[storeIndex][0], emailVerified: true },
    });
    const member = await prisma.user.upsert({
      where: { email: `equipe${storeIndex + 1}@example.test` },
      update: { name: team[storeIndex][1], emailVerified: true },
      create: { email: `equipe${storeIndex + 1}@example.test`, name: team[storeIndex][1], emailVerified: true },
    });
    await demoPasswordAccount(owner.id, isLocal);
    await demoPasswordAccount(member.id, isLocal);

    const createdAt = new Date(now.getTime() - (storeIndex === 0 ? 12 : 70 + storeIndex * 30) * day);
    const store = await prisma.store.create({
      data: {
        slug: demo.slug,
        name: demo.name,
        city: demo.city,
        businessCategory: demo.category,
        activityId: (await prisma.activity.findFirst({ where: { label: { startsWith: demo.category.split(" ")[0] } }, select: { id: true } }))?.id ?? null,
        phoneCountry: "CM",
        phoneNational: `69900${String(storeIndex).padStart(2, "0")}00`,
        phoneE164: `+23769900${String(storeIndex).padStart(2, "0")}00`,
        pickupAddress: `${neighborhoods[demo.city][0]}, ${demo.city}`,
        pickupHours: "Lundi au samedi, 9 h – 18 h",
        publishedAt: demo.subscription !== "EXPIRED" ? createdAt : null,
        contactPhone: `+23769900${String(storeIndex).padStart(2, "0")}00`,
        description: `${demo.name} : une boutique de démonstration à ${demo.city}. Paiement à la livraison.`,
        theme: demo.theme,
        primaryColor: demo.colors[0],
        secondaryColor: demo.colors[1],
        accentColor: demo.colors[2],
        isPublished: demo.subscription !== "EXPIRED",
        createdAt,
        memberships: {
          create: [
            { userId: owner.id, role: StoreRole.OWNER },
            { userId: member.id, role: storeIndex === 4 ? StoreRole.ORDER_PREPARER : StoreRole.MANAGER },
          ],
        },
        whatsappSettings: {
          create: { mode: "WA_ME", businessNumber: `+23769900${String(storeIndex).padStart(2, "0")}00`, productOrderButtonEnabled: true },
        },
      },
    });

    // Visites de la boutique sur 90 jours (tableau de bord : « Visites de la boutique »).
    await prisma.storeVisitDay.createMany({
      data: Array.from({ length: 90 }, (_, index) => {
        const date = new Date(now.getTime() + 60 * 60 * 1000 - index * day);
        return { storeId: store.id, day: new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`), visits: 5 + Math.floor(rand() * 40) };
      }),
    });

    // Le vendeur de « Mboa Style » gère aussi « Douala Maison » : démonstration du retour dans la dernière boutique.
    if (storeIndex === 1) {
      const firstVendor = await prisma.user.findUniqueOrThrow({ where: { email: "vendeur1@example.test" }, select: { id: true } });
      await prisma.storeMembership.create({ data: { storeId: store.id, userId: firstVendor.id, role: StoreRole.MANAGER } });
    }

    // Abonnements dans des états variés.
    const trialEndsAt = new Date(createdAt.getTime());
    trialEndsAt.setUTCMonth(trialEndsAt.getUTCMonth() + 1);
    const subscriptionData: Prisma.SubscriptionUncheckedCreateInput = {
      storeId: store.id,
      planId: plans.BUSINESS.id,
      status: SubscriptionStatus.TRIAL,
      trialStartedAt: createdAt,
      trialEndsAt,
    };
    if (demo.subscription === "MONTHLY" || demo.subscription === "YEARLY") {
      const period = demo.subscription === "MONTHLY" ? SubscriptionPeriod.MONTHLY : SubscriptionPeriod.YEARLY;
      const plan = demo.subscription === "MONTHLY" ? plans.ESSENTIAL ?? plans.BUSINESS : plans.PRO ?? plans.BUSINESS;
      const start = new Date(now.getTime() - 10 * day);
      const end = new Date(start);
      if (period === SubscriptionPeriod.MONTHLY) end.setUTCMonth(end.getUTCMonth() + 1);
      else end.setUTCFullYear(end.getUTCFullYear() + 1);
      Object.assign(subscriptionData, { planId: plan.id, status: SubscriptionStatus.ACTIVE, billingPeriod: period, currentPeriodStart: start, currentPeriodEnd: end });
    }
    if (demo.subscription === "EXPIRED") {
      Object.assign(subscriptionData, { status: SubscriptionStatus.EXPIRED, billingPeriod: SubscriptionPeriod.MONTHLY, currentPeriodStart: new Date(now.getTime() - 50 * day), currentPeriodEnd: new Date(now.getTime() - 20 * day) });
    }
    const subscription = await prisma.subscription.create({ data: subscriptionData });
    if (subscription.billingPeriod) {
      const plan = Object.values(plans).find((candidate) => candidate.id === subscription.planId)!;
      await prisma.subscriptionPayment.create({
        data: {
          subscriptionId: subscription.id,
          provider: "simulateur",
          eventId: `seed-${demo.slug}-1`,
          amountXaf: subscription.billingPeriod === "MONTHLY" ? plan.monthlyPriceXaf : plan.yearlyPriceXaf,
          period: subscription.billingPeriod,
          status: "SUCCEEDED",
          paidAt: subscription.currentPeriodStart,
        },
      });
    }

    // Catalogue.
    const categoryNames = [...new Set(catalogs[demo.slug].map((product) => product.category))];
    const categories = Object.fromEntries(
      await Promise.all(
        categoryNames.map(async (name, sortOrder) => [
          name,
          await prisma.productCategory.create({ data: { storeId: store.id, name, slug: slugify(name), sortOrder } }),
        ]),
      ),
    );
    const products = [];
    for (const [productIndex, seed] of catalogs[demo.slug].entries()) {
      const tracked = seed.stock !== undefined;
      const product = await prisma.product.create({
        data: {
          storeId: store.id,
          categoryId: categories[seed.category].id,
          name: seed.name,
          slug: slugify(seed.name),
          sku: `${demo.prefix}-${String(productIndex + 1).padStart(3, "0")}`,
          description: `${seed.name}, sélectionné avec soin par ${demo.name}. Produit d’exemple pour la démonstration.`,
          priceXaf: seed.price,
          promotionalPriceXaf: seed.promo ?? null,
          availability: seed.availability ?? ProductAvailability.AVAILABLE,
          trackInventory: tracked,
          stockQuantity: tracked ? seed.stock! : null,
          isFeatured: seed.featured ?? false,
          createdAt: new Date(createdAt.getTime() + productIndex * 3600_000),
          images: {
            create: [{ url: await placeholderImage(store.id, `p${productIndex}`, seed.name, demo.colors[0]), altText: seed.name, position: 0 }],
          },
          variants: seed.variants
            ? {
                create: seed.variants[1].map((value, variantIndex) => ({
                  sku: `${demo.prefix}-${String(productIndex + 1).padStart(3, "0")}-${variantIndex + 1}`,
                  optionName: seed.variants![0],
                  optionValue: value,
                  stockQuantity: 5 + variantIndex * 3,
                })),
              }
            : undefined,
        },
        include: { variants: true },
      });
      products.push(product);
    }
    const sellable = products.filter((product) => product.availability !== ProductAvailability.SOLD_OUT);

    // Livraison.
    const places = neighborhoods[demo.city];
    const zones = [
      await prisma.deliveryZone.create({ data: { storeId: store.id, city: demo.city, name: `${places[0]} et ${places[1]}`, feeXaf: 1000, estimatedDelay: "Sous 24 h" } }),
      await prisma.deliveryZone.create({ data: { storeId: store.id, city: demo.city, name: `${places[2]} et environs`, feeXaf: 1500, estimatedDelay: "24 à 48 h" } }),
      await prisma.deliveryZone.create({ data: { storeId: store.id, city: demo.city, name: "Toute la ville", feeXaf: 2500, estimatedDelay: "24 à 72 h" } }),
    ];

    // Assistant de la boutique activé sur la première boutique (démonstration du widget).
    if (storeIndex === 0) {
      await prisma.storeChatConfig.create({
        data: {
          storeId: store.id,
          enabled: true,
          welcomeMessage: "Bonjour et bienvenue chez {boutique} ! Je suis l’assistant de la boutique. Comment puis-je vous aider ?",
          transferTemplate: "Bonjour {boutique}, {question}. Merci !",
        },
      });
      await prisma.storeChatQuickReply.createMany({
        data: [
          { storeId: store.id, position: 0, label: "Livraison et délais", answer: `Nous livrons à ${demo.city} dès 1 000 FCFA, sous 24 h dans le centre. Le prix exact s’affiche avant de commander.` },
          { storeId: store.id, position: 1, label: "Moyens de paiement", answer: "Vous payez à la livraison, en espèces ou par mobile money." },
          { storeId: store.id, position: 2, label: "Échanges", answer: "Un article ne vous va pas ? Écrivez-nous sous 48 h, nous trouvons une solution." },
        ],
      });
    }

    // Clients.
    const customers = [];
    for (let customerIndex = 0; customerIndex < 20; customerIndex += 1) {
      const name = `${firstNames[(customerIndex + storeIndex * 3) % 20]} ${lastNames[(customerIndex * 7 + storeIndex) % 20]}`;
      const customer = await prisma.customer.create({
        data: {
          storeId: store.id,
          name,
          whatsapp: `+2376${String(storeIndex + 5)}${String(9000000 + customerIndex * 13 + storeIndex).padStart(7, "0")}`,
          email: customerIndex % 3 === 0 ? `client${customerIndex + 1}.${demo.prefix.toLowerCase()}@example.test` : null,
          source: customerIndex % 5 === 0 ? "manuel" : "storefront",
        },
      });
      customers.push(customer);
    }
    customerTotal += customers.length;

    // Commandes.
    const sequenceStart = 1001;
    const customerStats = new Map<string, { count: number; first: Date; last: Date }>();
    for (let orderIndex = 0; orderIndex < 36; orderIndex += 1) {
      const scenario = scenarios[orderIndex % scenarios.length];
      const customer = customers[orderIndex < 20 ? orderIndex : Math.floor(rand() * 8)];
      const age = orderIndex < 4 ? rand() * 0.4 : orderIndex < 10 ? 1 + rand() * 6 : 7 + rand() * 80;
      const orderDate = new Date(now.getTime() - age * day);
      const city = demo.city;
      const neighborhood = pick(places);
      const zone = pick(zones);
      const lineCount = 1 + Math.floor(rand() * 3);
      const lines = Array.from({ length: lineCount }, () => {
        const product = pick(sellable);
        const variant = product.variants.length ? pick(product.variants) : null;
        const quantity = 1 + Math.floor(rand() * 2);
        const unit = product.promotionalPriceXaf ?? product.priceXaf;
        return { product, variant, quantity, unit };
      });
      const subtotal = lines.reduce((sum, line) => sum + line.unit * line.quantity, 0);
      const fee = scenario.pickup ? 0 : zone.feeXaf ?? 0;
      const total = subtotal + fee;
      const reference = `${demo.prefix}-${sequenceStart + orderIndex}`;
      const validated = scenario.stage === "VALIDATED" || scenario.cancelledAfterValidation;
      const validatedAt = new Date(Math.min(now.getTime(), orderDate.getTime() + 20 * 3600_000));
      const cancelledAt = new Date(Math.min(now.getTime(), orderDate.getTime() + 30 * 3600_000));
      const processing: OrderProcessingStatus = scenario.stage === "NEW" ? "TO_REVIEW" : scenario.stage === "VALIDATED" ? "COMPLETED" : "CANCELLED";

      const order = await prisma.order.create({
        data: {
          storeId: store.id,
          customerId: customer.id,
          deliveryZoneId: scenario.pickup ? null : zone.id,
          reference,
          idempotencyKey: stableUuid("order", demo.slug, orderIndex),
          trackingToken: createHash("sha256").update(`track:${demo.slug}:${orderIndex}`).digest("base64url"),
          customerName: customer.name,
          customerWhatsapp: customer.whatsapp,
          customerEmail: customer.email,
          deliveryCity: city,
          neighborhood: scenario.pickup ? null : neighborhood,
          landmark: scenario.pickup ? null : pick(landmarks),
          deliveryMethod: scenario.pickup ? "PICKUP" : "DELIVERY",
          deliveryFeeXaf: fee,
          subtotalXaf: subtotal,
          totalXaf: total,
          confirmationStatus: "CONFIRMED",
          processingStatus: processing,
          deliveryStatus: scenario.pickup ? "PICKUP" : scenario.stage === "VALIDATED" ? "DELIVERED" : "TO_ORGANIZE",
          paymentStatus: scenario.stage === "VALIDATED" ? PaymentStatus.PAID : scenario.cancelledAfterValidation ? PaymentStatus.REFUNDED : PaymentStatus.PENDING,
          followUpConsent: true,
          marketingConsent: orderIndex % 3 === 0,
          expiresAt: new Date(orderDate.getTime() + 2 * day),
          createdAt: orderDate,
          updatedAt: scenario.stage === "NEW" ? orderDate : scenario.stage === "VALIDATED" ? validatedAt : cancelledAt,
          items: {
            create: lines.map((line) => ({
              productId: line.product.id,
              variantId: line.variant?.id ?? null,
              productName: line.product.name,
              variantName: line.variant ? `${line.variant.optionName} : ${line.variant.optionValue}` : null,
              sku: line.variant?.sku ?? line.product.sku,
              quantity: line.quantity,
              unitPriceXaf: line.unit,
              lineTotalXaf: line.unit * line.quantity,
            })),
          },
          events: {
            create: [
              { type: "CREATED", toValue: "TO_REVIEW", note: "Commande reçue sur la boutique.", createdAt: orderDate },
              ...(validated ? [{ type: "PROCESSING_COMPLETED", fromValue: "TO_REVIEW", toValue: "COMPLETED", actorId: owner.id, createdAt: validatedAt }] : []),
              ...(scenario.stage === "CANCELLED"
                ? [{ type: "PROCESSING_CANCELLED", fromValue: validated ? "COMPLETED" : "TO_REVIEW", toValue: "CANCELLED", actorId: owner.id, createdAt: cancelledAt }]
                : []),
            ],
          },
        },
        select: { id: true },
      });
      if (validated) {
        const payment = await prisma.payment.create({
          data: { storeId: store.id, orderId: order.id, authorId: owner.id, type: PaymentType.PAYMENT_RECEIVED, method: PaymentMethod.OTHER, amountXaf: total, note: "Commande validée", createdAt: validatedAt, receivedAt: validatedAt },
        });
        if (scenario.cancelledAfterValidation) {
          await prisma.payment.create({
            data: { storeId: store.id, orderId: order.id, authorId: owner.id, type: PaymentType.REVERSAL, method: PaymentMethod.OTHER, amountXaf: total, reversesId: payment.id, note: "Commande annulée", createdAt: cancelledAt, receivedAt: cancelledAt },
          });
        }
      }

      const stats = customerStats.get(customer.id);
      customerStats.set(customer.id, {
        count: (stats?.count ?? 0) + 1,
        first: stats && stats.first < orderDate ? stats.first : orderDate,
        last: stats && stats.last > orderDate ? stats.last : orderDate,
      });
      orderTotal += 1;
    }

    // CRM : statistiques, adresses, consentements, tags, notes, rappels.
    for (const [customerIndex, customer] of customers.entries()) {
      const stats = customerStats.get(customer.id);
      await prisma.customer.update({
        where: { id: customer.id },
        data: { orderCount: stats?.count ?? 0, firstOrderAt: stats?.first ?? null, lastOrderAt: stats?.last ?? null },
      });
      await prisma.customerAddress.create({ data: { customerId: customer.id, city: demo.city, neighborhood: places[customerIndex % places.length], landmark: landmarks[customerIndex % landmarks.length] } });
      await prisma.customerConsent.create({ data: { storeId: store.id, customerId: customer.id, type: ConsentType.ORDER_FOLLOW_UP, granted: true, source: "checkout" } });
      if (customerIndex % 3 === 0) {
        await prisma.customerConsent.create({ data: { storeId: store.id, customerId: customer.id, type: ConsentType.MARKETING, granted: true, source: "checkout" } });
      }
      if (customerIndex % 4 === 0) await prisma.customerTag.create({ data: { customerId: customer.id, name: customerIndex % 8 === 0 ? "VIP" : "Grossiste" } });
      if (customerIndex % 5 === 1) {
        await prisma.customerNote.create({ data: { storeId: store.id, customerId: customer.id, authorId: owner.id, content: "Préfère être livrée en fin de journée, après 17 h." } });
      }
      if (customerIndex % 6 === 2) {
        await prisma.customerReminder.create({
          data: { storeId: store.id, customerId: customer.id, authorId: owner.id, remindAt: new Date(now.getTime() - day), reason: "Proposer la nouvelle collection." },
        });
      }
    }

    await prisma.marketingCampaign.create({
      data: { storeId: store.id, createdById: owner.id, name: "Nouveautés du mois", audience: "all", message: "Bonjour ! Découvrez nos nouveautés de la semaine sur notre boutique.", recipientLimit: 50 },
    });

    // Accueil de la première boutique : bannière, promotions, mis en avant, mieux notés, menu et popup.
    if (storeIndex === 0) {
      // Quelques produits de plus pour avoir deux pages dans « mis en avant » et « mieux notés ».
      const extraCategory = Object.values(categories)[0] as { id: string };
      const extras = [];
      for (const [extraIndex, name] of ["Bracelet perles wax", "Pochette pagne", "Foulard bogolan", "Bob imprimé"].entries()) {
        extras.push(
          await prisma.product.create({
            data: {
              storeId: store.id,
              categoryId: extraCategory.id,
              name,
              slug: slugify(name),
              sku: `${demo.prefix}-X${extraIndex + 1}`,
              description: `${name}, produit d’exemple pour la démonstration.`,
              priceXaf: 4000 + extraIndex * 1500,
              createdAt,
              images: { create: [{ url: await placeholderImage(store.id, `x${extraIndex}`, name, demo.colors[0]), altText: name, position: 0 }] },
            },
          }),
        );
      }
      const live = [...sellable, ...extras].slice(0, 14);
      // 9 promotions (de -10 % à -50 %) : la rangée en montre 7, puis « Voir toutes les promotions ».
      for (const [index, product] of live.slice(0, 9).entries()) {
        const promo = Math.round((product.priceXaf * (90 - index * 5)) / 100 / 100) * 100;
        await prisma.product.update({ where: { id: product.id }, data: { promotionalPriceXaf: promo } });
      }
      // 14 produits mis en avant et notés : deux pages de 12 dans chaque section.
      await prisma.product.updateMany({ where: { id: { in: live.map((product) => product.id) } }, data: { isFeatured: true } });
      const reviewers = ["Aïcha", "Brice", "Carine", "Dimitri", "Estelle", "Franck"];
      for (const [index, product] of live.entries()) {
        for (let n = 0; n <= index % 3; n += 1) {
          await prisma.productReview.create({
            data: {
              storeId: store.id,
              productId: product.id,
              authorName: reviewers[(index + n) % reviewers.length],
              rating: 5 - ((index + n) % 3),
              comment: "Très bonne qualité, livraison rapide. Je recommande !",
              status: "APPROVED",
              moderatedAt: now,
              createdAt: new Date(now.getTime() - (index + n) * day),
            },
          });
        }
      }
      const firstCategory = Object.values(categories)[0] as { id: string; name: string };
      const bannerSlides = [
        { title: "Nouvelle collection", subtitle: `Découvrez ${firstCategory.name}`, linkType: "CATEGORY" as const, categoryId: firstCategory.id },
        { title: "Coup de cœur", subtitle: live[0].name, linkType: "PRODUCT" as const, productId: live[0].id },
        { title: "Jusqu’à -50 %", subtitle: "Toutes nos promotions", linkType: "PROMO" as const },
      ];
      for (const [position, slide] of bannerSlides.entries()) {
        await prisma.storeBanner.create({
          data: {
            storeId: store.id,
            position,
            imageUrl: await placeholderVisual(store.id, `banner-${position}`, slide.title, slide.subtitle, demo.colors[0], 1920, 1080),
            altText: `${slide.title} : ${slide.subtitle}`,
            linkType: slide.linkType,
            categoryId: "categoryId" in slide ? slide.categoryId : null,
            productId: "productId" in slide ? slide.productId : null,
          },
        });
      }
      await prisma.storePopup.create({
        data: {
          storeId: store.id,
          title: "Soldes de la semaine",
          imageUrl: await placeholderVisual(store.id, "popup-0", "-50 %", "Cette semaine seulement", demo.colors[0], 1080, 1350),
          altText: "Soldes de la semaine : jusqu’à -50 % sur une sélection",
          linkType: "PROMO",
          isActive: true,
        },
      });
      await prisma.storePage.createMany({
        data: [
          {
            storeId: store.id,
            kind: "ABOUT",
            title: "À propos",
            slug: "a-propos",
            status: "DRAFT",
            position: 0,
            blocks: [
              { type: "heading", text: "Notre histoire" },
              { type: "paragraph", text: `${demo.name} vous accueille avec des produits choisis avec soin. Paiement à la livraison.` },
            ],
          },
          {
            storeId: store.id,
            kind: "CONTACT",
            title: "Contact",
            slug: "contact",
            status: "DRAFT",
            position: 1,
            blocks: [{ type: "paragraph", text: "Écrivez-nous sur WhatsApp : nous répondons rapidement." }],
          },
        ],
      });
    }
  }

  // Administration : compte non confirmé (alerte), demande d'aide (ticket), notifications techniques (cloche).
  await prisma.user.upsert({
    where: { email: "prospect@example.test" },
    update: { emailVerified: false, createdAt: new Date(now.getTime() - 2 * day) },
    create: { email: "prospect@example.test", name: "Prospect Démo", emailVerified: false, createdAt: new Date(now.getTime() - 2 * day) },
  });
  await prisma.supportTicket.deleteMany({ where: { requesterEmail: "estelle@example.test" } });
  await prisma.supportTicket.create({
    data: {
      subject: "Question générale · Mboa Style",
      message: "Bonjour, comment ajouter une deuxième boutique à mon compte ?",
      requesterName: "Estelle Ndzi",
      requesterEmail: "estelle@example.test",
    },
  });
  await prisma.systemNotification.deleteMany({ where: { fingerprint: { startsWith: "seed-" } } });
  await prisma.systemNotification.createMany({
    data: [
      { fingerprint: "seed-email", type: "email", severity: "WARNING", message: "Échec d’envoi de l’e-mail E21 : délai de connexion au serveur SMTP dépassé", occurrences: 3 },
      { fingerprint: "seed-slow", type: "slow-query", severity: "WARNING", message: "Requête de plus de 2000 ms : SELECT \"public\".\"Order\".\"id\" …", occurrences: 1 },
    ],
  });

  console.info(
    `Données fictives prêtes : 5 boutiques, 10 membres, 1 administrateur, 64 produits, ${customerTotal} clients, ${orderTotal} commandes.`,
  );
  if (process.env.SEED_DEMO_PASSWORD && isLocal) {
    console.info("Connexion de démonstration : vendeur1@example.test (Mboa Style), admin@prestafrik.example.test, avec SEED_DEMO_PASSWORD.");
  }
}

main()
  .catch((error: unknown) => {
    console.error("Le seed de démonstration a échoué.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
