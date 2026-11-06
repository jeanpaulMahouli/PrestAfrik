import type { MetadataRoute } from "next";
import { blogPosts } from "@/components/landing/blog-posts";
import { disabledPages } from "@/components/landing/content";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, sharePreviewImage } from "@/lib/seo";
import { shopUrl } from "@/lib/urls";

// Lu à chaque visite de Google : une nouvelle rubrique de la marketplace y figure aussitôt.
export const dynamic = "force-dynamic";

const sitePages: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/fonctionnalites", priority: 0.8, changeFrequency: "monthly" },
  { path: "/tarifs", priority: 0.8, changeFrequency: "monthly" },
  { path: "/aide", priority: 0.6, changeFrequency: "monthly" },
  { path: "/aide/guide", priority: 0.6, changeFrequency: "monthly" },
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

  // Marketplace (shop.prestafrik.com en production) : accueil et rubriques.
  const activities = await prisma.activity.findMany({ where: { stores: { some: { isPublished: true, suspendedAt: null } } }, select: { slug: true } });
  const absolute = (url: string) => (/^https?:\/\//.test(url) ? url : absoluteUrl(url));
  const shop: MetadataRoute.Sitemap = [
    { url: absolute(shopUrl("/")), changeFrequency: "daily", priority: 0.9 },
    ...activities.map((activity) => ({ url: absolute(shopUrl(`/recherche?categorie=${activity.slug}`)), changeFrequency: "daily" as const, priority: 0.6 })),
  ];

  const blog: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.date,
    changeFrequency: "monthly",
    priority: 0.6,
    images: [absoluteUrl(post.cover.src)],
  }));

  // Les boutiques publiques (sous-domaines), leurs produits et leurs pages ne sont pas référencées :
  // elles sont en noindex (app/[slug]/layout.tsx, proxy.ts) et absentes de cette liste.
  return [...site, ...shop, ...blog];
}
