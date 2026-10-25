import "server-only";

import { ProductAvailability, type Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { discountPercent } from "@/modules/catalog/format";
import { storefrontTag } from "@/modules/catalog/service";
import { storedLinkSelect, type StoredLink } from "@/modules/merchandising/links";

// Mise en avant de l'accueil d'une boutique : bannière, promotions, produits mis en avant, mieux notés.
// Les catalogues restent petits : tout est lu en une fois (mis en cache 60 s) puis découpé en pages.

export const homeSectionPageSize = 12;
/** Cartes affichées dans la rangée « Promotions » avant la carte « Voir toutes les promotions ». */
export const promoRowSize = 7;

const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  priceXaf: true,
  promotionalPriceXaf: true,
  images: { take: 1, orderBy: { position: "asc" }, select: { url: true, altText: true } },
} satisfies Prisma.ProductSelect;

export type StoreCardProduct = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

const visibleProducts = (storeId: string): Prisma.ProductWhereInput => ({
  storeId,
  status: "ACTIVE",
  availability: { not: ProductAvailability.SOLD_OUT },
});

export type StoreBannerSlide = { id: string; imageUrl: string; altText: string } & StoredLink;

export function getStorefrontMerchandising(storeId: string) {
  return unstable_cache(
    async () => {
      const [banners, promoCandidates, featured, ratings, popup] = await Promise.all([
        prisma.storeBanner.findMany({
          where: { storeId },
          orderBy: { position: "asc" },
          take: 4,
          select: { id: true, imageUrl: true, altText: true, ...storedLinkSelect },
        }),
        prisma.product.findMany({
          where: { ...visibleProducts(storeId), promotionalPriceXaf: { not: null } },
          select: productCardSelect,
          take: 500,
        }),
        prisma.product.findMany({
          where: { ...visibleProducts(storeId), isFeatured: true },
          select: productCardSelect,
          orderBy: { updatedAt: "desc" },
          take: 240,
        }),
        prisma.productReview.groupBy({
          by: ["productId"],
          where: { storeId, status: "APPROVED", product: visibleProducts(storeId) },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        prisma.storePopup.findFirst({
          where: { storeId, isActive: true },
          select: { id: true, imageUrl: true, altText: true, startsAt: true, endsAt: true, ...storedLinkSelect },
        }),
      ]);

      // Promotions : vraie baisse de prix uniquement, de la plus forte à la plus faible.
      const promotions = promoCandidates
        .map((product) => ({ product, discount: discountPercent(product) }))
        .filter((entry) => entry.discount > 0)
        .sort((a, b) => b.discount - a.discount || a.product.name.localeCompare(b.product.name, "fr"))
        .map((entry) => entry.product);

      // Mieux notés : note moyenne, puis nombre d'avis (au moins un avis publié).
      const ranked = ratings
        .map((row) => ({ productId: row.productId, average: row._avg.rating ?? 0, count: row._count._all }))
        .filter((row) => row.count > 0)
        .sort((a, b) => b.average - a.average || b.count - a.count)
        .slice(0, 240);
      const topProducts = await prisma.product.findMany({ where: { id: { in: ranked.map((row) => row.productId) } }, select: productCardSelect });
      const byId = new Map(topProducts.map((product) => [product.id, product]));
      const topRated = ranked.flatMap((row) => byId.get(row.productId) ?? []);

      return { banners: banners as StoreBannerSlide[], promotions, featured, topRated, popup };
    },
    ["storefront-merchandising", storeId],
    { revalidate: 60, tags: [storefrontTag(storeId)] },
  )();
}

/** Numéro de page lu dans l'adresse (?featured=2), borné au nombre de pages disponibles. */
export function readPage(value: string | string[] | undefined, total: number, pageSize = homeSectionPageSize) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = typeof value === "string" ? Number.parseInt(value, 10) : 1;
  return Number.isFinite(page) ? Math.min(Math.max(page, 1), pages) : 1;
}

export function pageSlice<T>(items: T[], page: number, pageSize = homeSectionPageSize) {
  return items.slice((page - 1) * pageSize, page * pageSize);
}

/** Popup actif à afficher maintenant (dates comprises), ou null. Les dates sortent du cache en texte. */
export function currentPopup<T extends { startsAt: Date | string | null; endsAt: Date | string | null }>(popup: T | null, now = new Date()) {
  if (!popup) return null;
  if (popup.startsAt && new Date(popup.startsAt) > now) return null;
  if (popup.endsAt && new Date(popup.endsAt) < now) return null;
  return popup;
}
