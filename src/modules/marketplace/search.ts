import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { photoVariant } from "@/lib/product-photos";
import { storePublicUrl } from "@/lib/urls";

// Recherche publique de vendeurs (accueil et /recherche) : première brique de la marketplace.
// Seules les boutiques publiées et non suspendues sont lues, et seulement des champs publics
// (aucun téléphone, e-mail ni donnée client).
//
// Recherche insensible à la casse et aux accents. Avec quelques centaines de boutiques, la liste publique
// est lue une fois par minute et filtrée en mémoire : aucune extension PostgreSQL ni index à maintenir.
// Au-delà de quelques milliers de boutiques, remplacer `loadIndex` par une requête SQL (extensions
// unaccent + pg_trgm et index GIN) sans changer les fonctions exportées.

/** Requête de recherche : 2 à 60 caractères, caractères de contrôle et chevrons retirés. */
export const searchQuerySchema = z
  .string()
  .transform((value) => value.replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim())
  .pipe(z.string().min(2).max(60));

export function parseSearchQuery(raw: unknown) {
  const result = searchQuerySchema.safeParse(typeof raw === "string" ? raw : "");
  return result.success ? result.data : null;
}

/** Minuscules sans accents : « Yaoundé » → « yaounde ». */
export function normalizeForSearch(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const countryNames = new Intl.DisplayNames(["fr"], { type: "region" });
export const countryName = (iso: string) => {
  try {
    return countryNames.of(iso) ?? iso;
  } catch {
    return iso;
  }
};

export type SearchableStore = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string;
  activity: string | null;
  description: string | null;
  logoUrl: string | null;
  createdAt: Date;
  /** Texte normalisé de chaque champ, calculé une fois au chargement. */
  haystack: { name: string; city: string; activity: string; description: string };
};

let cache: { at: number; stores: SearchableStore[] } | null = null;
const cacheTtlMs = 60_000;

async function loadIndex(): Promise<SearchableStore[]> {
  if (cache && Date.now() - cache.at < cacheTtlMs) return cache.stores;
  const rows = await prisma.store.findMany({
    where: { isPublished: true, suspendedAt: null },
    select: { id: true, name: true, slug: true, city: true, country: true, description: true, logoUrl: true, createdAt: true, activityOther: true, activity: { select: { label: true } } },
  });
  const stores = rows.map((row) => {
    const activity = row.activity?.label ?? row.activityOther ?? null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      city: row.city,
      country: row.country,
      activity,
      description: row.description,
      logoUrl: row.logoUrl,
      createdAt: row.createdAt,
      haystack: {
        name: normalizeForSearch(row.name),
        city: normalizeForSearch(`${row.city ?? ""} ${countryName(row.country)}`),
        activity: normalizeForSearch(activity ?? ""),
        description: normalizeForSearch(row.description ?? ""),
      },
    };
  });
  cache = { at: Date.now(), stores };
  return stores;
}

/**
 * Score de classement d'une boutique pour une requête. Point d'extension de la marketplace : les avis
 * positifs puis les offres de « boost » s'ajouteront ici (voir docs/marketplace.md). Aucun boost n'existe
 * encore : le classement ne dépend que de la pertinence du texte.
 */
export function relevanceScore(store: SearchableStore, terms: string[]) {
  let score = 0;
  for (const term of terms) {
    const { name, city, activity, description } = store.haystack;
    if (name.startsWith(term)) score += 100;
    else if (name.split(/[\s'-]+/).some((word) => word.startsWith(term))) score += 70;
    else if (name.includes(term)) score += 50;
    else if (city.split(/\s+/).some((word) => word.startsWith(term))) score += 40;
    else if (activity.includes(term)) score += 30;
    else if (description.includes(term)) score += 10;
    else return 0; // Chaque mot de la requête doit apparaître quelque part.
  }
  return score;
}

export type StoreFilters = { city?: string; activity?: string };

/** Boutiques correspondant à la requête, les plus pertinentes d'abord (puis les plus récentes). */
export async function searchStores(query: string, filters: StoreFilters = {}) {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  const stores = await loadIndex();
  const matches = stores
    .map((store) => ({ store, score: relevanceScore(store, terms) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.store.createdAt.getTime() - a.store.createdAt.getTime())
    .map(({ store }) => store);
  const facets = {
    cities: [...new Set(matches.map((store) => store.city).filter((city): city is string => Boolean(city)))].sort((a, b) => a.localeCompare(b, "fr")),
    activities: [...new Set(matches.map((store) => store.activity).filter((activity): activity is string => Boolean(activity)))].sort((a, b) => a.localeCompare(b, "fr")),
  };
  const filtered = matches.filter((store) => (!filters.city || store.city === filters.city) && (!filters.activity || store.activity === filters.activity));
  return { stores: filtered, total: filtered.length, facets };
}

export type StoreSuggestion = { name: string; slug: string; href: string; city: string | null; country: string; activity: string | null; logoUrl: string | null };

/** Suggestions pendant la saisie (6 au plus). */
export async function suggestStores(query: string, limit = 6): Promise<StoreSuggestion[]> {
  const { stores } = await searchStores(query);
  return stores.slice(0, limit).map((store) => ({
    name: store.name,
    slug: store.slug,
    href: storePublicUrl(store.slug),
    city: store.city,
    country: countryName(store.country),
    activity: store.activity,
    logoUrl: store.logoUrl,
  }));
}

export type TopProduct = { name: string; slug: string; priceXaf: number; promotionalPriceXaf: number | null; imageUrl: string | null; rating: number | null; reviewCount: number };

/**
 * Produits mis en avant sur la carte d'une boutique : les mieux notés (avis approuvés), complétés par les
 * plus récents. Aucune note n'est inventée : un produit sans avis n'a pas de note (`rating: null`).
 * Point unique pour faire évoluer ce choix (ventes, boost…).
 */
export async function getTopProducts(storeId: string, take = 4): Promise<TopProduct[]> {
  const where = { storeId, status: "ACTIVE" as const, archivedAt: null };
  const rated = await prisma.productReview.groupBy({
    by: ["productId"],
    where: { storeId, status: "APPROVED", product: where },
    _avg: { rating: true },
    _count: { _all: true },
    orderBy: [{ _avg: { rating: "desc" } }, { _count: { productId: "desc" } }],
    take,
  });
  const ratings = new Map(rated.map((row) => [row.productId, { rating: row._avg.rating, count: row._count._all }]));
  const select = { id: true, name: true, slug: true, priceXaf: true, promotionalPriceXaf: true, images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true } } };
  const [best, recent] = await Promise.all([
    rated.length ? prisma.product.findMany({ where: { ...where, id: { in: [...ratings.keys()] } }, select }) : Promise.resolve([]),
    prisma.product.findMany({ where: { ...where, id: { notIn: [...ratings.keys()] } }, orderBy: { createdAt: "desc" }, take, select }),
  ]);
  best.sort((a, b) => (ratings.get(b.id)?.rating ?? 0) - (ratings.get(a.id)?.rating ?? 0));
  return [...best, ...recent].slice(0, take).map((product) => {
    const rating = ratings.get(product.id);
    const image = product.images[0]?.url ?? null;
    return {
      name: product.name,
      slug: product.slug,
      priceXaf: product.priceXaf,
      promotionalPriceXaf: product.promotionalPriceXaf,
      imageUrl: image ? photoVariant(image, 320) : null,
      rating: rating?.rating ? Math.round(rating.rating * 10) / 10 : null,
      reviewCount: rating?.count ?? 0,
    };
  });
}

/**
 * Top des boutiques (page « Nos boutiques ») : les mieux notées par leurs clients (avis approuvés : moyenne,
 * pondérée par le nombre d'avis), puis celles qui ont le plus de produits en ligne. Aucune note inventée.
 */
export async function getTopStores(take = 10): Promise<SearchableStore[]> {
  const stores = await loadIndex();
  if (!stores.length) return [];
  const ids = stores.map((store) => store.id);
  const [reviews, products] = await Promise.all([
    prisma.productReview.groupBy({ by: ["storeId"], where: { storeId: { in: ids }, status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.product.groupBy({ by: ["storeId"], where: { storeId: { in: ids }, status: "ACTIVE", archivedAt: null }, _count: { _all: true } }),
  ]);
  const ratingScore = new Map(reviews.map((row) => [row.storeId, (row._avg.rating ?? 0) * Math.log2(1 + row._count._all)]));
  const productCount = new Map(products.map((row) => [row.storeId, row._count._all]));
  return stores
    .filter((store) => (productCount.get(store.id) ?? 0) > 0)
    .sort((a, b) => (ratingScore.get(b.id) ?? 0) - (ratingScore.get(a.id) ?? 0) || (productCount.get(b.id) ?? 0) - (productCount.get(a.id) ?? 0) || a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, take);
}
