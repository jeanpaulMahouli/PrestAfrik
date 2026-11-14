import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fuzzyRank } from "@/lib/fuzzy-search";
import { photoVariant } from "@/lib/product-photos";
import { shopUrl, storePublicUrl } from "@/lib/urls";
import { categoryRank, cityKey } from "@/config/marketplace";
import { scopeKey, type ShopScope } from "./country";
import { clearSearchIndex, getTopStores, loadIndex, type SearchableStore } from "./search";

// Marketplace PrestAfrik (shop.prestafrik.com) : les boutiques publiées et leurs produits, rangés par
// rubriques. Ventes flash, offres exclusives et boutiques à la une sont choisies par l'administration
// (Administration → Marketplace) ; tout le reste est calculé. Aucun prix, note ni stock n'est inventé :
// les prix sont ceux des vendeurs, les notes viennent des avis approuvés.

export type ShopProduct = {
  id: string;
  name: string;
  href: string;
  imageUrl: string | null;
  /** Grande variante (800 px) pour les vitrines (héros, bannières, carte vedette). */
  largeImageUrl: string | null;
  priceXaf: number;
  /** Prix barré : le prix normal quand le vendeur a fixé un prix promotionnel. */
  oldPriceXaf: number | null;
  /** Réduction en %, arrondie (null sans promotion). */
  discount: number | null;
  rating: number | null;
  reviewCount: number;
  /** Boutique du vendeur (sa propre vitrine) ; la fiche produit, elle, reste sur la marketplace. */
  store: { name: string; slug: string; href: string; logoUrl: string | null };
  /** Stock suivi par le vendeur : quantité encore disponible (null si non suivie). */
  stockLeft: number | null;
  /** Catégorie (activité de la boutique) : sert à l'ordre de priorité. */
  activitySlug: string | null;
  /** Boutique mise en avant par l'administration (ses produits passent devant). */
  featured: boolean;
};

export type ShopStore = SearchableStore & { href: string; productCount: number; rating: number | null };

export type ShopCategory = { slug: string; label: string; imageUrl: string | null; storeCount: number; productCount: number };

/** Fiche produit sur la marketplace : prestafrik.com/produit/{boutique}/{produit}. */
export const marketplaceProductPath = (storeSlug: string, productSlug: string) => shopUrl(`/produit/${storeSlug}/${productSlug}`);

const productSelect = {
  id: true,
  name: true,
  slug: true,
  priceXaf: true,
  promotionalPriceXaf: true,
  trackInventory: true,
  stockQuantity: true,
  reservedQuantity: true,
  storeId: true,
  images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

/** Produits visibles sur la marketplace : en ligne, disponibles, d'une boutique publiée, et avec au moins une photo. */
/** Prix minimal d'un produit sur la marketplace : 0 FCFA ou un prix dérisoire (erreur de saisie) n'y apparaît pas. */
export const minMarketplacePriceXaf = 50;

/** Le prix payé (promotion comprise) atteint le minimum de la marketplace. */
export const hasMarketplacePrice = (product: { priceXaf: number; promotionalPriceXaf: number | null }) =>
  (product.promotionalPriceXaf !== null && product.promotionalPriceXaf < product.priceXaf ? product.promotionalPriceXaf : product.priceXaf) >= minMarketplacePriceXaf;

const visible = (storeIds: string[]): Prisma.ProductWhereInput => ({
  storeId: { in: storeIds },
  status: "ACTIVE",
  archivedAt: null,
  availability: "AVAILABLE",
  images: { some: {} },
  // Ni produit à 0 FCFA, ni prix (ou prix promotionnel) sous 50 FCFA.
  priceXaf: { gte: minMarketplacePriceXaf },
  OR: [{ promotionalPriceXaf: null }, { promotionalPriceXaf: { gte: minMarketplacePriceXaf } }],
});

async function ratingsOf(productIds: string[]) {
  if (!productIds.length) return new Map<string, { rating: number; count: number }>();
  const rows = await prisma.productReview.groupBy({ by: ["productId"], where: { productId: { in: productIds }, status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } });
  return new Map(rows.map((row) => [row.productId, { rating: row._avg.rating ?? 0, count: row._count._all }]));
}

/** Boutiques mises en avant par l'administration (« Boutiques à la une »), lues une fois par minute. */
let featuredCache: { at: number; ids: Set<string> } | null = null;
async function featuredStoreIds() {
  if (featuredCache && Date.now() - featuredCache.at < 60_000) return featuredCache.ids;
  const rows = await prisma.marketplacePick.findMany({ where: { section: "FEATURED_STORE", storeId: { not: null }, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, select: { storeId: true } });
  featuredCache = { at: Date.now(), ids: new Set(rows.flatMap((row) => (row.storeId ? [row.storeId] : []))) };
  return featuredCache.ids;
}

/** Ordre de la marketplace : boutiques mises en avant d'abord, puis catégories prioritaires. */
const byPriority = (a: ShopProduct, b: ShopProduct) => Number(b.featured) - Number(a.featured) || categoryRank(a.activitySlug) - categoryRank(b.activitySlug);

async function toShopProducts(rows: ProductRow[], stores: Map<string, SearchableStore>): Promise<ShopProduct[]> {
  const [ratings, featuredIds] = await Promise.all([ratingsOf(rows.map((row) => row.id)), featuredStoreIds()]);
  return rows.flatMap((row) => {
    const store = stores.get(row.storeId);
    // Sélections de l'administration comprises : jamais de produit sous le prix minimal.
    if (!store || !hasMarketplacePrice(row)) return [];
    const promo = row.promotionalPriceXaf !== null && row.promotionalPriceXaf < row.priceXaf ? row.promotionalPriceXaf : null;
    const rating = ratings.get(row.id);
    const image = row.images[0]?.url ?? null;
    const storeHref = storePublicUrl(store.slug);
    return [
      {
        id: row.id,
        name: row.name,
        href: marketplaceProductPath(store.slug, row.slug),
        imageUrl: image ? photoVariant(image, 320) : null,
        largeImageUrl: image ? photoVariant(image, 800) : null,
        priceXaf: promo ?? row.priceXaf,
        oldPriceXaf: promo === null ? null : row.priceXaf,
        discount: promo === null ? null : Math.round((1 - promo / row.priceXaf) * 100),
        rating: rating?.count ? Math.round(rating.rating * 10) / 10 : null,
        reviewCount: rating?.count ?? 0,
        store: { name: store.name, slug: store.slug, href: storeHref, logoUrl: store.logoUrl },
        stockLeft: row.trackInventory && row.stockQuantity !== null ? Math.max(0, row.stockQuantity - row.reservedQuantity) : null,
        activitySlug: store.activitySlug,
        featured: featuredIds.has(store.id),
      },
    ];
  });
}

/**
 * Boutiques montrées au visiteur : celles de son univers (vente, immobilier, services), dans sa ville
 * quand elle en a, sinon dans tout le Cameroun et la zone. `local` dit si le filtre par ville s'applique.
 */
export async function scopedStores(scope: Pick<ShopScope, "universe" | "city">): Promise<{ stores: SearchableStore[]; local: boolean }> {
  const all = (await loadIndex()).filter((store) => store.universe === scope.universe);
  if (!scope.city) return { stores: all, local: false };
  const key = cityKey(scope.city.name);
  const local = all.filter((store) => store.city && cityKey(store.city) === key);
  return local.length ? { stores: local, local: true } : { stores: all, local: false };
}

const toMap = (stores: SearchableStore[]) => new Map(stores.map((store) => [store.id, store]));

/** Produits les mieux notés (moyenne pondérée par le nombre d'avis), complétés par les plus récents. */
async function topRated(stores: Map<string, SearchableStore>, take: number, extra: Prisma.ProductWhereInput = {}) {
  const where = { ...visible([...stores.keys()]), ...extra };
  const rated = await prisma.productReview.groupBy({ by: ["productId"], where: { status: "APPROVED", product: where }, _avg: { rating: true }, _count: { _all: true } });
  const score = new Map(rated.map((row) => [row.productId, (row._avg.rating ?? 0) * Math.log2(1 + row._count._all)]));
  const ids = [...score.keys()].sort((a, b) => (score.get(b) ?? 0) - (score.get(a) ?? 0)).slice(0, take);
  const best = ids.length ? await prisma.product.findMany({ where: { id: { in: ids } }, select: productSelect }) : [];
  best.sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0));
  return toShopProducts(best, stores);
}

/**
 * Produits d'une rubrique : promotions d'abord (plus forte réduction en tête), puis les mieux notés, puis
 * les plus récents. Une rubrique ne mélange jamais ses produits avec ceux d'une autre.
 */
async function categoryProducts(stores: Map<string, SearchableStore>, storeIds: string[], take: number) {
  const rows = await prisma.product.findMany({ where: visible(storeIds), orderBy: { createdAt: "desc" }, take: 80, select: productSelect });
  const products = await toShopProducts(rows, stores);
  const score = (product: ShopProduct) => (product.rating ?? 0) * Math.log2(1 + product.reviewCount);
  return products.sort((a, b) => Number(b.featured) - Number(a.featured) || (b.discount ?? 0) - (a.discount ?? 0) || score(b) - score(a)).slice(0, take);
}

/** Sélections de l'administration (ventes flash et offres exclusives) : produits encore visibles. */
async function picks(section: "FLASH" | "EXCLUSIVE" | "DEAL_LEAD", stores: Map<string, SearchableStore>) {
  const now = new Date();
  // « Bonne affaire vedette » : section ajoutée par la migration 20261109120000 ; rien tant qu'elle manque.
  const rows = await prisma.marketplacePick
    .findMany({
      where: { section, product: visible([...stores.keys()]), OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { endsAt: true, product: { select: productSelect } },
    })
    .catch(() => []);
  const products = await toShopProducts(rows.flatMap((row) => (row.product ? [row.product] : [])), stores);
  // Compte à rebours : la première fin de vente flash à venir.
  const endsAt = rows.map((row) => row.endsAt).filter((date): date is Date => Boolean(date)).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  return { products, endsAt };
}

async function decorateStores(list: SearchableStore[]): Promise<ShopStore[]> {
  const ids = list.map((store) => store.id);
  if (!ids.length) return [];
  const [products, reviews] = await Promise.all([
    prisma.product.groupBy({ by: ["storeId"], where: { storeId: { in: ids }, status: "ACTIVE", archivedAt: null }, _count: { _all: true } }),
    prisma.productReview.groupBy({ by: ["storeId"], where: { storeId: { in: ids }, status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } }),
  ]);
  const count = new Map(products.map((row) => [row.storeId, row._count._all]));
  const rating = new Map(reviews.map((row) => [row.storeId, row._count._all ? Math.round((row._avg.rating ?? 0) * 10) / 10 : null]));
  return list.map((store) => ({ ...store, href: storePublicUrl(store.slug), productCount: count.get(store.id) ?? 0, rating: rating.get(store.id) ?? null }));
}

/** Rubriques (activités des boutiques) qui ont au moins une boutique en ligne, avec leurs compteurs. */
export async function getShopCategories(scope: Pick<ShopScope, "universe" | "city">): Promise<ShopCategory[]> {
  const { stores } = await scopedStores(scope);
  const [activities, products] = await Promise.all([
    prisma.activity.findMany({ orderBy: { position: "asc" }, select: { slug: true, label: true, imageUrl: true } }),
    prisma.product.groupBy({ by: ["storeId"], where: visible(stores.map((store) => store.id)), _count: { _all: true } }),
  ]);
  const perStore = new Map(products.map((row) => [row.storeId, row._count._all]));
  return activities
    .map((activity) => {
      const members = stores.filter((store) => store.activitySlug === activity.slug);
      return { slug: activity.slug, label: activity.label, imageUrl: activity.imageUrl, storeCount: members.length, productCount: members.reduce((sum, store) => sum + (perStore.get(store.id) ?? 0), 0) };
    })
    .filter((category) => category.storeCount > 0)
    // Vêtements et beauté, puis électronique et accessoires, puis les autres (ordre de l'administration).
    .sort((a, b) => categoryRank(a.slug) - categoryRank(b.slug));
}

export type ShopHome = {
  /** Vrai si seules les boutiques de la ville du visiteur sont montrées. */
  local: boolean;
  categories: ShopCategory[];
  flash: { products: ShopProduct[]; endsAt: Date | null };
  exclusive: ShopProduct[];
  /** Les incontournables du moment : produits les mieux notés de l'univers et de la ville. */
  topProducts: ShopProduct[];
  /** Une rangée par grande rubrique (vêtements, électronique… jamais mélangés). */
  sections: { category: ShopCategory; products: ShopProduct[] }[];
  /** Vraies promotions des vendeurs (prix promotionnel fixé), plus forte réduction en tête. */
  deals: ShopProduct[];
  /** Produit vedette des bonnes affaires (le grand, à gauche), choisi par l'administration. */
  dealLead: ShopProduct | null;
  /** Derniers produits mis en ligne. */
  newest: ShopProduct[];
  /** Petits prix (à partir de 100 FCFA : les prix symboliques sont écartés). */
  smallPrices: ShopProduct[];
  featuredStores: ShopStore[];
};

const homeCache = new Map<string, { at: number; value: ShopHome }>();
const homeTtlMs = 60_000;

/** Après une modification de l'administration : la marketplace est recalculée à la visite suivante. */
export function clearShopCache() {
  homeCache.clear();
  featuredCache = null;
  clearSearchIndex();
}

/** Accueil de la marketplace pour un univers et une ville, gardé une minute en mémoire. */
export async function getShopHome(scope: Pick<ShopScope, "universe" | "city">): Promise<ShopHome> {
  const key = scopeKey(scope);
  const cached = homeCache.get(key);
  if (cached && Date.now() - cached.at < homeTtlMs) return cached.value;
  const { stores: list, local } = await scopedStores(scope);
  const stores = toMap(list);
  const now = new Date();
  const ids = [...stores.keys()];
  const [categories, flash, exclusive, featuredPicks, topStores, topProducts, newestRows, cheapRows, promoRows, dealLead] = await Promise.all([
    getShopCategories(scope),
    picks("FLASH", stores),
    picks("EXCLUSIVE", stores),
    prisma.marketplacePick.findMany({ where: { section: "FEATURED_STORE", OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { storeId: true } }),
    getTopStores(200),
    topRated(stores, 12),
    prisma.product.findMany({ where: visible(ids), orderBy: { createdAt: "desc" }, take: 6, select: productSelect }),
    prisma.product.findMany({ where: { ...visible(ids), priceXaf: { gte: 100 }, OR: [{ promotionalPriceXaf: null }, { promotionalPriceXaf: { gte: 100 } }] }, orderBy: [{ priceXaf: "asc" }, { createdAt: "desc" }], take: 6, select: productSelect }),
    prisma.product.findMany({ where: { ...visible(ids), promotionalPriceXaf: { not: null } }, orderBy: { createdAt: "desc" }, take: 120, select: productSelect }),
    picks("DEAL_LEAD", stores),
  ]);
  const [newest, smallPrices, promos] = await Promise.all([toShopProducts(newestRows, stores), toShopProducts(cheapRows, stores), toShopProducts(promoRows, stores)]);
  // Bonnes affaires : boutiques mises en avant et catégories prioritaires d'abord, puis la plus forte réduction.
  const deals = promos
    .filter((product) => product.discount && product.discount > 0)
    .sort((a, b) => byPriority(a, b) || (b.discount ?? 0) - (a.discount ?? 0))
    .slice(0, 12);
  const sections = (
    await Promise.all(
      categories
        .filter((category) => category.productCount > 0)
        .map(async (category) => {
          const ids = list.filter((store) => store.activitySlug === category.slug).map((store) => store.id);
          return { category, products: await categoryProducts(stores, ids, 12) };
        }),
    )
  ).filter((section) => section.products.length > 0);
  const featured = featuredPicks.flatMap((pick) => (pick.storeId && stores.get(pick.storeId) ? [stores.get(pick.storeId)!] : []));
  const fallback = topStores.filter((store) => stores.has(store.id)).slice(0, 10);
  const value: ShopHome = { local, categories, flash, exclusive: exclusive.products, topProducts, sections, deals, dealLead: dealLead.products[0] ?? null, newest, smallPrices, featuredStores: await decorateStores(featured.length ? featured : fallback) };
  homeCache.set(key, { at: Date.now(), value });
  return value;
}

export const shopSorts = { pertinence: "Pertinence", "mieux-notes": "Mieux notés", promo: "Plus grosses promos", nouveautes: "Nouveautés", "prix-croissant": "Prix croissant", "prix-decroissant": "Prix décroissant" } as const;
export type ShopSort = keyof typeof shopSorts;

export type ShopQuery = { q?: string; category?: string; min?: number; max?: number; sort?: ShopSort; promo?: boolean };

/**
 * Explorer la marketplace : produits (48 au plus) et boutiques correspondant à une recherche, une rubrique,
 * un budget ou un tri. Le prix pris en compte est le prix payé (prix promotionnel s'il existe).
 */
export async function exploreShop(query: ShopQuery, scope: Pick<ShopScope, "universe" | "city">): Promise<{ products: ShopProduct[]; stores: ShopStore[]; category: ShopCategory | null }> {
  const { stores: all } = await scopedStores(scope);
  const categories = query.category ? await getShopCategories(scope) : [];
  const category = categories.find((item) => item.slug === query.category) ?? null;
  const terms = (query.q ?? "").trim();
  const inCategory = all.filter((store) => !query.category || store.activitySlug === query.category);
  const stores = new Map(inCategory.map((store) => [store.id, store]));
  // Boutiques dont le nom, l'activité ou la ville correspondent (recherche tolérante : fautes, pluriels…).
  const matchingStores = terms
    ? fuzzyRank(inCategory, terms, (store) => [
        { text: store.haystack.name, weight: 1 },
        { text: store.haystack.activity, weight: 0.8 },
        { text: store.haystack.city, weight: 0.8 },
      ])
    : inCategory;

  let relevance: Map<string, number> | null = null;
  const price: Prisma.ProductWhereInput[] = [];
  if (query.max) price.push({ OR: [{ promotionalPriceXaf: { lte: query.max } }, { promotionalPriceXaf: null, priceXaf: { lte: query.max } }] });
  if (query.min) price.push({ OR: [{ promotionalPriceXaf: { gte: query.min } }, { promotionalPriceXaf: null, priceXaf: { gte: query.min } }] });
  const where: Prisma.ProductWhereInput = {
    ...visible([...stores.keys()]),
    AND: [
      ...price,
      ...(query.promo ? [{ promotionalPriceXaf: { not: null } }] : []),
    ],
  };
  // Recherche de produits tolérante : les produits candidats (sans le texte) sont classés par pertinence
  // (nom, catégorie, description, boutique), puis seuls les 200 meilleurs sont lus en entier.
  if (terms) {
    const candidates = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 3000,
      select: { id: true, name: true, description: true, storeId: true, category: { select: { name: true } } },
    });
    const ranked = fuzzyRank(candidates, terms, (product) => {
      const store = stores.get(product.storeId);
      return [
        { text: product.name, weight: 1 },
        { text: product.category?.name, weight: 0.85 },
        { text: product.description?.slice(0, 600), weight: 0.55 },
        { text: store?.haystack.name, weight: 0.5 },
        { text: store?.haystack.activity, weight: 0.45 },
      ];
    }).slice(0, 200);
    (where.AND as Prisma.ProductWhereInput[]).push({ id: { in: ranked.map((product) => product.id) } });
    relevance = new Map(ranked.map((product, index) => [product.id, index]));
  }

  let products: ShopProduct[];
  if (query.sort === "mieux-notes") products = await topRated(stores, 48, where);
  else {
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === "prix-croissant" ? { priceXaf: "asc" } : query.sort === "prix-decroissant" ? { priceXaf: "desc" } : { createdAt: "desc" };
    const rows = await prisma.product.findMany({ where, orderBy, take: query.sort === "promo" || relevance ? 200 : 48, select: productSelect });
    products = await toShopProducts(rows, stores);
    // Pertinence : boutiques mises en avant et catégories prioritaires d'abord (le tri reste stable).
    if (query.sort === "pertinence" || !query.sort) {
      // Avec une recherche : les plus proches de ce qui a été tapé d'abord.
      const rank = relevance;
      products.sort(rank ? (a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999) : byPriority);
    }
    if (query.promo) products = products.filter((product) => product.discount);
    if (query.sort === "promo") products = products.sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0)).slice(0, 48);
    // Le tri par prix porte sur le prix payé (promotion comprise).
    if (query.sort === "prix-croissant") products.sort((a, b) => a.priceXaf - b.priceXaf);
    if (query.sort === "prix-decroissant") products.sort((a, b) => b.priceXaf - a.priceXaf);
    products = products.slice(0, 48);
  }
  return { products, stores: await decorateStores(terms || query.category ? matchingStores.slice(0, 20) : []), category };
}

/** Rubriques de l'administration : produits ou boutiques retenus, dans l'ordre. */
export async function getMarketplacePicks() {
  return prisma.marketplacePick.findMany({
    orderBy: [{ section: "asc" }, { position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      section: true,
      endsAt: true,
      position: true,
      product: { select: { name: true, slug: true, priceXaf: true, promotionalPriceXaf: true, status: true, store: { select: { name: true, slug: true } } } },
      storeId: true,
      store: { select: { name: true, slug: true, isPublished: true } },
    },
  });
}

/** Boutique visible sur la marketplace (publiée, non suspendue), ou null. */
export async function marketplaceStore(slug: string) {
  return (await loadIndex()).find((store) => store.slug === slug) ?? null;
}

/**
 * Autour d'une fiche produit : d'autres produits de la même boutique, des produits de la même catégorie
 * (autres boutiques), les bonnes affaires et les nouveautés de la marketplace.
 */
export async function getProductNeighbours(store: SearchableStore, productId: string, scope: Pick<ShopScope, "universe" | "city">) {
  const all = await loadIndex();
  const stores = toMap(all);
  const sameCategory = store.activitySlug ? all.filter((item) => item.activitySlug === store.activitySlug && item.id !== store.id).map((item) => item.id) : [];
  const [own, similar, home] = await Promise.all([
    prisma.product.findMany({ where: { ...visible([store.id]), id: { not: productId } }, orderBy: { createdAt: "desc" }, take: 6, select: productSelect }),
    sameCategory.length ? prisma.product.findMany({ where: { ...visible(sameCategory), priceXaf: { gte: 100 } }, orderBy: { createdAt: "desc" }, take: 6, select: productSelect }) : [],
    getShopHome(scope),
  ]);
  const [sameStore, sameActivity] = await Promise.all([toShopProducts(own, stores), toShopProducts(similar, stores)]);
  const others = (products: ShopProduct[]) => products.filter((product) => product.id !== productId && product.priceXaf >= 100 && product.imageUrl);
  return { sameStore: others(sameStore), similar: others(sameActivity), deals: others(home.deals), newest: others(home.newest), categories: home.categories, sections: home.sections };
}
