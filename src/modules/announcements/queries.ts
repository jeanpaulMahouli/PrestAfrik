import "server-only";

import { prisma } from "@/lib/prisma";

/** Dossier de stockage des images d'annonces (même format que les images de boutique). */
export const announcementMediaId = "prestafrikannonces0000";

export type DashboardAnnouncement = { id: string; imageUrl: string; altText: string; linkUrl: string | null };

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

/** Visuels de la marketplace (shop.prestafrik.com) : grand diaporama et deux visuels à côté. */
export async function getShopAnnouncements(): Promise<{ carousel: DashboardAnnouncement[]; banners: DashboardAnnouncement[] }> {
  const rows = await prisma.platformAnnouncement
    .findMany({ where: { active: true, placement: { in: ["SHOP_CAROUSEL", "SHOP_BANNER"] } }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true, placement: true, imageUrl: true, altText: true, linkUrl: true } })
    .catch(() => []);
  const pick = (row: (typeof rows)[number]): DashboardAnnouncement => ({ id: row.id, imageUrl: row.imageUrl, altText: row.altText, linkUrl: row.linkUrl });
  return { carousel: rows.filter((row) => row.placement === "SHOP_CAROUSEL").map(pick), banners: rows.filter((row) => row.placement === "SHOP_BANNER").map(pick).slice(0, 2) };
}
