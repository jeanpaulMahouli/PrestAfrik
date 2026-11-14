import "server-only";

import { ProductAvailability, type Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { fuzzyRank } from "@/lib/fuzzy-search";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { isStoreSubscriptionPaused } from "@/modules/subscriptions/service";
export { formatXaf } from "@/modules/catalog/format";

export const storefrontTag = (storeIdOrSlug: string) => `storefront:${storeIdOrSlug}`;

export async function getPublishedStore(slug: string) {
  const store = await unstable_cache(
    () =>
      prisma.store.findFirst({
        // Une boutique suspendue par l'administration n'est plus visible (brief §6.13).
        where: { slug, isPublished: true, suspendedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          description: true,
          theme: true,
          promoStyle: true,
          logoUrl: true,
          bannerUrl: true,
          primaryColor: true,
          secondaryColor: true,
          accentColor: true,
          facebookUrl: true,
          instagramUrl: true,
          tiktokUrl: true,
          youtubeUrl: true,
          xUrl: true,
          reviewsEnabled: true,
          categories: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true } },
          _count: { select: { products: { where: { status: "ACTIVE" } } } },
        },
      }),
    ["published-store", slug],
    { revalidate: 60, tags: [storefrontTag(slug)] },
  )();
  if (!store) return null;

  const subscription = await prisma.subscription.findUnique({
    where: { storeId: store.id },
    select: { status: true, trialEndsAt: true, currentPeriodEnd: true },
  });
  return {
    ...store,
    subscriptionPaused: isStoreSubscriptionPaused(subscription),
  };
}

async function resolveStorefrontStore(slug: string) {
  const publishedStore = await getPublishedStore(slug);
  if (publishedStore) return { ...publishedStore, isPreview: false };

  const [{ headers }, { auth }] = await Promise.all([
    import("next/headers"),
    import("@/modules/auth/server"),
  ]);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const draftStore = await prisma.store.findFirst({
    where: {
      slug,
      isPublished: false,
      memberships: { some: { userId: session.user.id } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      description: true,
      theme: true,
      promoStyle: true,
      logoUrl: true,
      bannerUrl: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      facebookUrl: true,
      instagramUrl: true,
      tiktokUrl: true,
      youtubeUrl: true,
      xUrl: true,
      reviewsEnabled: true,
      categories: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true } },
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
  });
  return draftStore ? { ...draftStore, isPreview: true, subscriptionPaused: false } : null;
}

export const getStorefrontStore = cache(resolveStorefrontStore);

export async function getPublishedProducts(
  storeId: string,
  { category, query }: { category?: string; query?: string } = {},
) {
  return unstable_cache(
    async () => {
      const where: Prisma.ProductWhereInput = {
        storeId,
        status: "ACTIVE",
        availability: { not: ProductAvailability.SOLD_OUT },
        ...(category ? { category: { slug: category } } : {}),
      };

      // Recherche tolérante (fautes, pluriels, débuts de mots, synonymes) : faite sur tout le catalogue de
      // la boutique, puis les 100 produits les plus pertinents.
      const rows = await prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          priceXaf: true,
          promotionalPriceXaf: true,
          availability: true,
          trackInventory: true,
          stockQuantity: true,
          listingType: true,
          pricePeriod: true,
          images: { take: 1, orderBy: { position: "asc" }, select: { url: true, altText: true } },
          sku: true,
          category: { select: { name: true } },
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: query ? 1000 : 100,
      });
      // Champs de recherche retirés du résultat (la vitrine ne les reçoit pas).
      const publicFields = (row: (typeof rows)[number]) => {
        const product: Omit<typeof row, "sku" | "category"> & { sku?: unknown; category?: unknown } = { ...row };
        delete product.sku;
        delete product.category;
        return product as Omit<typeof row, "sku" | "category">;
      };
      if (!query) return rows.map(publicFields);
      return fuzzyRank(rows, query, (product) => [
        { text: product.name, weight: 1 },
        { text: product.category?.name, weight: 0.85 },
        { text: product.sku, weight: 0.8 },
        { text: product.description, weight: 0.55 },
      ])
        .slice(0, 100)
        .map(publicFields);
    },
    ["published-products", storeId, category ?? "", query ?? ""],
    { revalidate: 60, tags: [storefrontTag(storeId)] },
  )();
}

export async function getPublishedProduct(storeId: string, slug: string) {
  return unstable_cache(
    () =>
      prisma.product.findFirst({
        where: {
          storeId,
          slug,
          status: "ACTIVE",
          availability: { not: ProductAvailability.SOLD_OUT },
        },
        select: {
          id: true,
          storeId: true,
          categoryId: true,
          name: true,
          slug: true,
          description: true,
          sku: true,
          priceXaf: true,
          promotionalPriceXaf: true,
          availability: true,
          trackInventory: true,
          stockQuantity: true,
          listingType: true,
          pricePeriod: true,
          propertyDetails: true,
          variants: {
            where: { isArchived: false },
            orderBy: { optionValue: "asc" },
            select: { id: true, sku: true, optionName: true, optionValue: true, priceXaf: true, stockQuantity: true },
          },
          images: { orderBy: { position: "asc" }, select: { url: true, altText: true } },
        },
      }),
    ["published-product", storeId, slug],
    { revalidate: 60, tags: [storefrontTag(storeId)] },
  )();
}
