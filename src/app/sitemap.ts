import { ProductAvailability } from "@prisma/client";
import type { MetadataRoute } from "next";
import { blogPosts } from "@/components/landing/blog-posts";
import { disabledPages } from "@/components/landing/content";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, sharePreviewImage } from "@/lib/seo";
import { storePublicUrl } from "@/lib/urls";

// Lu à chaque visite de Google : une boutique publiée ou un nouveau produit y figure aussitôt.
export const dynamic = "force-dynamic";

/** Une sitemap contient au plus 50 000 adresses (protocole sitemaps.org). */
const maxProducts = 45_000;

const sitePages: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/fonctionnalites", priority: 0.8, changeFrequency: "monthly" },
  { path: "/tarifs", priority: 0.8, changeFrequency: "monthly" },
  { path: "/aide", priority: 0.6, changeFrequency: "monthly" },
  { path: "/nos-boutiques", priority: 0.8, changeFrequency: "daily" },
  { path: "/demo", priority: 0.7, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/a-propos", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
  { path: "/inscription", priority: 0.6, changeFrequency: "yearly" },
  { path: "/legal/conditions-generales", priority: 0.2, changeFrequency: "yearly" },
  { path: "/legal/conditions-de-vente", priority: 0.2, changeFrequency: "yearly" },
  { path: "/legal/politique-de-confidentialite", priority: 0.2, changeFrequency: "yearly" },
  { path: "/legal/mentions-legales", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site: MetadataRoute.Sitemap = sitePages
    .filter((page) => !disabledPages.has(page.path))
    .map((page) => ({
      url: absoluteUrl(page.path),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      ...(page.path === "/" ? { images: [absoluteUrl(sharePreviewImage.url)] } : {}),
    }));

  const blog: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.date,
    changeFrequency: "monthly",
    priority: 0.6,
    images: [absoluteUrl(post.cover.src)],
  }));

  // Boutiques en ligne uniquement : les brouillons et boutiques suspendues ne sont pas indexés.
  const onlineStore = { isPublished: true, suspendedAt: null };
  const [stores, products, pages] = await Promise.all([
    prisma.store.findMany({
      where: onlineStore,
      select: { slug: true, updatedAt: true, logoUrl: true, bannerUrl: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.product.findMany({
      where: { store: onlineStore, status: "ACTIVE", availability: { not: ProductAvailability.SOLD_OUT } },
      select: {
        slug: true,
        updatedAt: true,
        store: { select: { slug: true } },
        images: { orderBy: { position: "asc" }, take: 5, select: { url: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: maxProducts,
    }),
    prisma.storePage.findMany({
      where: { store: onlineStore, status: "PUBLISHED" },
      select: { slug: true, updatedAt: true, store: { select: { slug: true } } },
    }),
  ]);

  const storeEntries: MetadataRoute.Sitemap = stores.map((store) => {
    const images = [store.bannerUrl, store.logoUrl].filter((url): url is string => Boolean(url)).map(absoluteUrl);
    return {
      url: storePublicUrl(store.slug),
      lastModified: store.updatedAt,
      changeFrequency: "daily",
      priority: 0.9,
      ...(images.length ? { images } : {}),
    };
  });

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${storePublicUrl(product.store.slug)}/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
    ...(product.images.length ? { images: product.images.map((image) => absoluteUrl(image.url)) } : {}),
  }));

  const pageEntries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${storePublicUrl(page.store.slug)}/page/${page.slug}`,
    lastModified: page.updatedAt,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  return [...site, ...blog, ...storeEntries, ...productEntries, ...pageEntries];
}
