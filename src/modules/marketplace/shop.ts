import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { photoVariant } from "@/lib/product-photos";
import { storePublicUrl } from "@/lib/urls";
import { cityKey, universeOfActivity } from "@/config/marketplace";
import { scopeKey, type ShopScope } from "./country";
import { getTopStores, loadIndex, normalizeForSearch, type SearchableStore } from "./search";

// Marketplace PrestAfrik (shop.prestafrik.com) : les boutiques publiées et leurs produits, rangés par
// rubriques. Ventes flash, offres exclusives et boutiques à la une sont choisies par l'administration
// (Administration → Marketplace) ; tout le reste est calculé. Aucun prix, note ni stock n'est inventé :
// les prix sont ceux des vendeurs, les notes viennent des avis approuvés.

export type ShopProduct = {
  id: string;
  name: string;
  href: string;
  imageUrl: string | null;
  priceXaf: number;
  /** Prix barré : le prix normal quand le vendeur a fixé un prix promotionnel. */
  oldPriceXaf: number | null;
  /** Réduction en %, arrondie (null sans promotion). */
  discount: number | null;
  rating: number | null;
  reviewCount: number;
  store: { name: string; href: string; logoUrl: string | null };
  /** Stock suivi par le vendeur : quantité encore disponible (null si non suivie). */
  stockLeft: number | null;
};

export type ShopStore = SearchableStore & { href: string; productCount: number; rating: number | null };

export type ShopCategory = { slug: string; label: string; imageUrl: string | null; storeCount: number; productCount: number };

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
const visible = (storeIds: string[]): Prisma.ProductWhereInput => ({ storeId: { in: storeIds }, status: "ACTIVE", archivedAt: null, availability: "AVAILABLE", images: { some: {} } });

async function ratingsOf(productIds: string[]) {
  if (!productIds.length) return new Map<string, { rating: number; count: number }>();
  const rows = await prisma.productReview.groupBy({ by: ["productId"], where: { productId: { in: productIds }, status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } });
  return new Map(rows.map((row) => [row.productId, { rating: row._avg.rating ?? 0, count: row._count._all }]));
}

async function toShopProducts(rows: ProductRow[], stores: Map<string, SearchableStore>): Promise<ShopProduct[]> {
  const ratings = await ratingsOf(rows.map((row) => row.id));
  return rows.flatMap((row) => {
    const store = stores.get(row.storeId);
    if (!store) return [];
    const promo = row.promotionalPriceXaf !== null && row.promotionalPriceXaf < row.priceXaf ? row.promotionalPriceXaf : null;
    const rating = ratings.get(row.id);
    const image = row.images[0]?.url ?? null;
    const storeHref = storePublicUrl(store.slug);
    return [
      {
        id: row.id,
        name: row.name,
        href: `${storeHref}/${row.slug}`,
        imageUrl: image ? photoVariant(image, 320) : null,
        priceXaf: promo ?? row.priceXaf,
        oldPriceXaf: promo === null ? null : row.priceXaf,
        discount: promo === null ? null : Math.round((1 - promo / row.priceXaf) * 100),
        rating: rating?.count ? Math.round(rating.rating * 10) / 10 : null,
        reviewCount: rating?.count ?? 0,
        store: { name: store.name, href: storeHref, logoUrl: store.logoUrl },
        stockLeft: row.trackInventory && row.stockQuantity !== null ? Math.max(0, row.stockQuantity - row.reservedQuantity) : null,
      },
    ];
  });
}

/**
 * Boutiques montrées au visiteur : celles de son univers (vente, immobilier, services), dans sa ville
 * quand elle en a, sinon dans tout le Cameroun et la zone. `local` dit si le filtre par ville s'applique.
 */
export async function scopedStores(scope: Pick<ShopScope, "universe" | "city">): Promise<{ stores: SearchableStore[]; local: boolean }> {
  const all = (await loadIndex()).filter((store) => universeOfActivity(store.activitySlug) === scope.universe);
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
  return products.sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0) || score(b) - score(a)).slice(0, take);
}

/** Sélections de l'administration (ventes flash et offres exclusives) : produits encore visibles. */
async function picks(section: "FLASH" | "EXCLUSIVE", stores: Map<string, SearchableStore>) {
  const now = new Date();
  const rows = await prisma.marketplacePick.findMany({
    where: { section, product: visible([...stores.keys()]), OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { endsAt: true, product: { select: productSelect } },
  });
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
    .filter((category) => category.storeCount > 0);
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
  featuredStores: ShopStore[];
};

const homeCache = new Map<string, { at: number; value: ShopHome }>();
const homeTtlMs = 60_000;

/** Après une modification de l'administration : la marketplace est recalculée à la visite suivante. */
export function clearShopCache() {
  homeCache.clear();
}

/** Accueil de la marketplace pour un univers et une ville, gardé une minute en mémoire. */
export async function getShopHome(scope: Pick<ShopScope, "universe" | "city">): Promise<ShopHome> {
  const key = scopeKey(scope);
  const cached = homeCache.get(key);
  if (cached && Date.now() - cached.at < homeTtlMs) return cached.value;
  const { stores: list, local } = await scopedStores(scope);
  const stores = toMap(list);
  const now = new Date();
  const [categories, flash, exclusive, featuredPicks, topStores, topProducts] = await Promise.all([
    getShopCategories(scope),
    picks("FLASH", stores),
    picks("EXCLUSIVE", stores),
    prisma.marketplacePick.findMany({ where: { section: "FEATURED_STORE", OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { storeId: true } }),
    getTopStores(200),
    topRated(stores, 12),
  ]);
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
  const value: ShopHome = { local, categories, flash, exclusive: exclusive.products, topProducts, sections, featuredStores: await decorateStores(featured.length ? featured : fallback) };
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
  const words = normalizeForSearch(terms).split(/\s+/).filter(Boolean);
  // Boutiques dont le nom, l'activité ou la ville contient chaque mot recherché.
  const matchingStores = words.length
    ? inCategory.filter((store) => words.every((word) => `${store.haystack.name} ${store.haystack.activity} ${store.haystack.city}`.includes(word)))
    : inCategory;

  const price: Prisma.ProductWhereInput[] = [];
  if (query.max) price.push({ OR: [{ promotionalPriceXaf: { lte: query.max } }, { promotionalPriceXaf: null, priceXaf: { lte: query.max } }] });
  if (query.min) price.push({ OR: [{ promotionalPriceXaf: { gte: query.min } }, { promotionalPriceXaf: null, priceXaf: { gte: query.min } }] });
  const where: Prisma.ProductWhereInput = {
    ...visible([...stores.keys()]),
    AND: [
      ...price,
      ...(query.promo ? [{ promotionalPriceXaf: { not: null } }] : []),
      ...(terms ? [{ OR: [{ name: { contains: terms, mode: "insensitive" as const } }, { storeId: { in: matchingStores.map((store) => store.id) } }] }] : []),
    ],
  };

  let products: ShopProduct[];
  if (query.sort === "mieux-notes") products = await topRated(stores, 48, where);
  else {
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === "prix-croissant" ? { priceXaf: "asc" } : query.sort === "prix-decroissant" ? { priceXaf: "desc" } : { createdAt: "desc" };
    const rows = await prisma.product.findMany({ where, orderBy, take: query.sort === "promo" ? 200 : 48, select: productSelect });
    products = await toShopProducts(rows, stores);
    if (query.promo) products = products.filter((product) => product.discount);
    if (query.sort === "promo") products = products.sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0)).slice(0, 48);
    // Le tri par prix porte sur le prix payé (promotion comprise).
    if (query.sort === "prix-croissant") products.sort((a, b) => a.priceXaf - b.priceXaf);
    if (query.sort === "prix-decroissant") products.sort((a, b) => b.priceXaf - a.priceXaf);
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
      store: { select: { name: true, slug: true, isPublished: true } },
    },
  });
}
