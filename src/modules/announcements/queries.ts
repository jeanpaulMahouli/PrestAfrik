import "server-only";

import { prisma } from "@/lib/prisma";

/** Dossier de stockage des images d'annonces (même format que les images de boutique). */
export const announcementMediaId = "prestafrikannonces0000";

export type DashboardAnnouncement = { id: string; imageUrl: string; altText: string; linkUrl: string | null; ctaLabel?: string | null };

/** Annonces actives du tableau de bord des vendeurs : diaporama (pleine largeur) et bannière. */
export async function getDashboardAnnouncements(): Promise<{ carousel: DashboardAnnouncement[]; banner: DashboardAnnouncement | null }> {
  const rows = await prisma.platformAnnouncement
    .findMany({ where: { active: true, placement: { in: ["CAROUSEL", "BANNER"] } }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true, placement: true, imageUrl: true, altText: true, linkUrl: true } })
    .catch(() => []);
  const pick = (row: (typeof rows)[number]): DashboardAnnouncement => ({ id: row.id, imageUrl: row.imageUrl, altText: row.altText, linkUrl: row.linkUrl });
  return {
    carousel: rows.filter((row) => row.placement === "CAROUSEL").map(pick),
    banner: rows.filter((row) => row.placement === "BANNER").map(pick)[0] ?? null,
  };
}

/**
 * Visuels de la marketplace (shop.prestafrik.com) : sur ordinateur, grand diaporama et deux visuels à côté ;
 * sur téléphone, une seule bannière rectangulaire gérée à part.
 */
export async function getShopAnnouncements(): Promise<{ carousel: DashboardAnnouncement[]; banners: DashboardAnnouncement[]; mobile: DashboardAnnouncement | null; immo: DashboardAnnouncement | null; services: DashboardAnnouncement | null }> {
  const rows = await prisma.platformAnnouncement
    .findMany({
      where: { active: true, placement: { in: ["SHOP_CAROUSEL", "SHOP_BANNER", "SHOP_MOBILE", "SHOP_IMMO", "SHOP_SERVICES"] } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, placement: true, imageUrl: true, altText: true, linkUrl: true, ctaLabel: true },
    })
    .catch(() => []);
  const pick = (row: (typeof rows)[number]): DashboardAnnouncement => ({ id: row.id, imageUrl: row.imageUrl, altText: row.altText, linkUrl: row.linkUrl, ctaLabel: row.ctaLabel });
  return {
    carousel: rows.filter((row) => row.placement === "SHOP_CAROUSEL").map(pick),
    banners: rows.filter((row) => row.placement === "SHOP_BANNER").map(pick).slice(0, 2),
    mobile: rows.filter((row) => row.placement === "SHOP_MOBILE").map(pick)[0] ?? null,
    immo: rows.filter((row) => row.placement === "SHOP_IMMO").map(pick)[0] ?? null,
    services: rows.filter((row) => row.placement === "SHOP_SERVICES").map(pick)[0] ?? null,
  };
}

/** Textes du bandeau publicitaire de la marketplace (un toutes les 2 secondes). */
export async function getShopTicker(): Promise<{ id: string; text: string; linkUrl: string | null }[]> {
  return prisma.marketplaceTicker
    .findMany({ where: { active: true }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true, text: true, linkUrl: true } })
    .catch(() => []);
}

/** Durée d'affichage de chaque texte du bandeau publicitaire (secondes, 4 par défaut). */
export async function getShopTickerSeconds(): Promise<number> {
  const settings = await prisma.marketplaceSettings.findUnique({ where: { id: "shop" }, select: { tickerSeconds: true } }).catch(() => null);
  return settings?.tickerSeconds ?? 4;
}
