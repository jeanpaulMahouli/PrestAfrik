import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { storefrontTag } from "@/modules/catalog/service";

export type RatingSummary = { average: number; count: number };

/** Note moyenne et nombre d'avis publiés, par produit (grille du catalogue, produits similaires). */
export function getRatingSummaries(storeId: string) {
  return unstable_cache(
    async (): Promise<Record<string, RatingSummary>> => {
      const rows = await prisma.productReview.groupBy({
        by: ["productId"],
        where: { storeId, status: "APPROVED" },
        _avg: { rating: true },
        _count: { _all: true },
      });
      return Object.fromEntries(rows.map((row) => [row.productId, { average: row._avg.rating ?? 0, count: row._count._all }]));
    },
    ["rating-summaries", storeId],
    { revalidate: 60, tags: [storefrontTag(storeId)] },
  )();
}

/** Avis publiés d'un produit (les 30 plus récents) et leur synthèse. */
export function getProductReviews(storeId: string, productId: string) {
  return unstable_cache(
    async () => {
      const [reviews, stats] = await Promise.all([
        prisma.productReview.findMany({
          where: { storeId, productId, status: "APPROVED" },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { id: true, authorName: true, rating: true, comment: true, createdAt: true },
        }),
        prisma.productReview.aggregate({ where: { storeId, productId, status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } }),
      ]);
      // Le cache est sérialisé en JSON : la date est transmise en texte ISO.
      return {
        reviews: reviews.map((review) => ({ ...review, createdAt: review.createdAt.toISOString() })),
        summary: { average: stats._avg.rating ?? 0, count: stats._count._all } satisfies RatingSummary,
      };
    },
    ["product-reviews", storeId, productId],
    { revalidate: 60, tags: [storefrontTag(storeId)] },
  )();
}

/** Produits similaires : même catégorie d'abord, puis le reste du catalogue (4 au plus). */
export function getSimilarProducts(storeId: string, productId: string, categoryId: string | null, take = 4) {
  return unstable_cache(
    async () => {
      const select = {
        id: true,
        name: true,
        slug: true,
        priceXaf: true,
        promotionalPriceXaf: true,
        images: { take: 1, orderBy: { position: "asc" as const }, select: { url: true, altText: true } },
      };
      const base = { storeId, status: "ACTIVE" as const, availability: { not: "SOLD_OUT" as const }, id: { not: productId } };
      const sameCategory = categoryId
        ? await prisma.product.findMany({ where: { ...base, categoryId }, select, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }], take })
        : [];
      if (sameCategory.length >= take) return sameCategory;
      const others = await prisma.product.findMany({
        where: { ...base, id: { notIn: [productId, ...sameCategory.map((item) => item.id)] } },
        select,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: take - sameCategory.length,
      });
      return [...sameCategory, ...others];
    },
    ["similar-products", storeId, productId, categoryId ?? ""],
    { revalidate: 60, tags: [storefrontTag(storeId)] },
  )();
}
