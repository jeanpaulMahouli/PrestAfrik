"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ImageUploadError, deleteStoreImage, saveStoreImage } from "@/lib/uploads";
import { logAdminAction, requirePlatformAdmin } from "@/modules/admin/context";
import { announcementMediaId } from "@/modules/announcements/queries";

// Administration → Annonces : images affichées en haut du tableau de bord de tous les vendeurs, et en haut
// de la marketplace (shop.prestafrik.com : grand diaporama et deux visuels à côté).

const listPath = "/admin/annonces";
/**
 * Formats d'image : tableau de bord (diaporama 16:5, bannière fine 8:1) ; marketplace, aux formats de la
 * maquette, en double résolution (héros 872 × 520, visuels de côté 424 × 248, colonnes, bannières).
 */
const frames = {
  CAROUSEL: { width: 1920, height: 600 },
  BANNER: { width: 1920, height: 240 },
  SHOP_CAROUSEL: { width: 1744, height: 1040 },
  SHOP_BANNER: { width: 848, height: 496 },
  SHOP_SELLER: { width: 848, height: 496 },
  SHOP_FEATURED_COLUMN: { width: 624, height: 1432 },
  SHOP_DUO: { width: 1296, height: 672 },
  SHOP_COLUMN_TOP: { width: 624, height: 856 },
  SHOP_COLUMN_BOTTOM: { width: 624, height: 528 },
  SHOP_WIDE: { width: 2876, height: 848 },
  SHOP_SEARCH_SIDE: { width: 624, height: 1150 },
  SHOP_MENU: { width: 624, height: 768 },
  // Téléphone : une seule bannière rectangulaire (2:1), indépendante des visuels de l'ordinateur.
  SHOP_MOBILE: { width: 1200, height: 600 },
  // Immobilier et Services : une seule bannière, ordinateur et téléphone (8:3).
  SHOP_IMMO: { width: 1600, height: 600 },
  SHOP_SERVICES: { width: 1600, height: 600 },
  SHOP_RESTAURATION: { width: 1600, height: 600 },
} as const;
const maxPerPlacement = {
  CAROUSEL: 6,
  BANNER: 3,
  SHOP_CAROUSEL: 6,
  SHOP_BANNER: 1,
  SHOP_MOBILE: 1,
  SHOP_IMMO: 1,
  SHOP_SERVICES: 1,
  SHOP_RESTAURATION: 1,
  SHOP_SELLER: 1,
  SHOP_FEATURED_COLUMN: 1,
  SHOP_DUO: 2,
  SHOP_COLUMN_TOP: 1,
  SHOP_COLUMN_BOTTOM: 1,
  SHOP_WIDE: 1,
  SHOP_SEARCH_SIDE: 1,
  SHOP_MENU: 1,
} as const;
const idSchema = z.string().min(10).max(40).regex(/^[a-z0-9]+$/);

const fieldsSchema = z.object({
  placement: z.enum(["CAROUSEL", "BANNER", "SHOP_CAROUSEL", "SHOP_BANNER", "SHOP_MOBILE", "SHOP_IMMO", "SHOP_SERVICES", "SHOP_RESTAURATION", "SHOP_SELLER", "SHOP_FEATURED_COLUMN", "SHOP_DUO", "SHOP_COLUMN_TOP", "SHOP_COLUMN_BOTTOM", "SHOP_WIDE", "SHOP_SEARCH_SIDE", "SHOP_MENU"]),
  altText: z.string().trim().min(3, "Décrivez l’image en quelques mots (lecteurs d’écran).").max(160),
  linkUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || /^\/(?!\/)[^\s]*$/.test(value) || /^https:\/\/[^\s]+$/.test(value), "Le lien doit commencer par « / » (page de PrestAfrik) ou « https:// ».")
    .transform((value) => value || null),
  ctaLabel: z
    .string()
    .trim()
    .max(40, "Le texte du bouton ne peut pas dépasser 40 caractères.")
    .transform((value) => value || null),
});

/** Onglet de la page Annonces où revenir : « marketplace » (par défaut) ou « tableau-de-bord ». */
const espaceOf = (placement: string) => (placement.startsWith("SHOP_") ? "marketplace" : "tableau-de-bord");

function back(message: string, kind: "succes" | "erreur" = "succes", espace?: string): never {
  redirect(`${listPath}?${espace ? `espace=${espace}&` : ""}${kind}=${encodeURIComponent(message)}`);
}

function refresh() {
  revalidatePath(listPath);
  revalidatePath("/dashboard");
  revalidatePath("/nos-boutiques");
}

export async function createAnnouncement(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const fields = fieldsSchema.safeParse({ placement: formData.get("placement"), altText: formData.get("altText") ?? "", linkUrl: formData.get("linkUrl") ?? "", ctaLabel: formData.get("ctaLabel") ?? "" });
  if (!fields.success) back(fields.error.issues[0]?.message ?? "Vérifiez les informations.", "erreur");
  const { placement, altText, linkUrl, ctaLabel } = fields.data;
  // Nouveaux emplacements : ils existent en base après la migration 20261109120000_marketplace_admin_and_likes.
  const existing = await prisma.platformAnnouncement.count({ where: { placement } }).catch(() => null);
  if (existing === null) back("Cet emplacement sera disponible après la mise à jour de la base de données (migration de la marketplace).", "erreur", espaceOf(placement));
  if (existing >= maxPerPlacement[placement]) {
    back(`${maxPerPlacement[placement]} image${maxPerPlacement[placement] > 1 ? "s" : ""} au plus pour cet emplacement : supprimez-en une d’abord.`, "erreur", espaceOf(placement));
  }
  let imageUrl: string;
  try {
    const saved = await saveStoreImage(formData.get("image"), announcementMediaId, { frame: frames[placement] });
    if (!saved) back("Choisissez une image.", "erreur", espaceOf(placement));
    imageUrl = saved.url;
  } catch (error) {
    if (error instanceof ImageUploadError) back(error.message, "erreur", espaceOf(placement));
    throw error;
  }
  const position = await prisma.platformAnnouncement.count({ where: { placement } });
  const created = await prisma.platformAnnouncement.create({ data: { placement, imageUrl, altText, linkUrl, ctaLabel: placement.startsWith("SHOP_") ? ctaLabel : null, position } });
  await logAdminAction(admin.id, { action: "announcement.create", targetType: "announcement", targetId: created.id, details: { placement } });
  refresh();
  back(placement.startsWith("SHOP_") ? "Image ajoutée : elle est déjà visible sur la marketplace." : "Image ajoutée : elle est déjà visible sur le tableau de bord des vendeurs.", "succes", espaceOf(placement));
}

export async function toggleAnnouncement(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) back("Annonce introuvable.", "erreur");
  const item = await prisma.platformAnnouncement.findUnique({ where: { id: id.data } });
  if (!item) back("Annonce introuvable.", "erreur");
  await prisma.platformAnnouncement.update({ where: { id: item.id }, data: { active: !item.active } });
  await logAdminAction(admin.id, { action: item.active ? "announcement.hide" : "announcement.show", targetType: "announcement", targetId: item.id });
  refresh();
  back(item.active ? "Image masquée." : "Image de nouveau visible.", "succes", espaceOf(item.placement));
}

export async function moveAnnouncement(formData: FormData) {
  await requirePlatformAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const direction = formData.get("direction") === "up" ? -1 : 1;
  if (!id.success) back("Annonce introuvable.", "erreur");
  const item = await prisma.platformAnnouncement.findUnique({ where: { id: id.data } });
  if (!item) back("Annonce introuvable.", "erreur");
  const siblings = await prisma.platformAnnouncement.findMany({ where: { placement: item.placement }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const index = siblings.findIndex((row) => row.id === item.id);
  const target = index + direction;
  if (target < 0 || target >= siblings.length) back("Déjà à cette place.", "succes", espaceOf(item.placement));
  const order = siblings.map((row) => row.id);
  [order[index], order[target]] = [order[target], order[index]];
  await prisma.$transaction(order.map((rowId, position) => prisma.platformAnnouncement.update({ where: { id: rowId }, data: { position } })));
  refresh();
  back("Ordre mis à jour.", "succes", espaceOf(item.placement));
}

export async function deleteAnnouncement(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) back("Annonce introuvable.", "erreur");
  const item = await prisma.platformAnnouncement.findUnique({ where: { id: id.data } });
  if (!item) back("Annonce introuvable.", "erreur");
  await prisma.platformAnnouncement.delete({ where: { id: item.id } });
  await deleteStoreImage(item.imageUrl);
  await logAdminAction(admin.id, { action: "announcement.delete", targetType: "announcement", targetId: item.id });
  refresh();
  back("Image supprimée.", "succes", espaceOf(item.placement));
}
