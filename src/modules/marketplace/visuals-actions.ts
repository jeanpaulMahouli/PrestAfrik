"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ImageUploadError, deleteStoreImage, saveStoreImage } from "@/lib/uploads";
import { logAdminAction, requirePlatformAdmin } from "@/modules/admin/context";
import { announcementMediaId } from "@/modules/announcements/queries";
import { clearShopCache } from "@/modules/marketplace/shop";

// Administration → Marketplace : images rondes des catégories et textes du bandeau publicitaire.

const listPath = "/admin/marketplace";
const idSchema = z.string().min(3).max(40).regex(/^[a-z0-9_]+$/i);
const linkSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || /^\/(?!\/)[^\s]*$/.test(value) || /^https:\/\/[^\s]+$/.test(value), "Le lien doit commencer par « / » ou « https:// ».")
  .transform((value) => value || null);
const maxTickers = 8;

function back(message: string, kind: "succes" | "erreur" = "succes", onglet: "bandeau" | "categories" = "bandeau"): never {
  redirect(`${listPath}?onglet=${onglet}&${kind}=${encodeURIComponent(message)}`);
}

function refresh() {
  clearShopCache();
  revalidatePath(listPath);
  revalidatePath("/nos-boutiques");
}

/** Image ronde d'une catégorie (recadrée en carré 400 × 400). Remplace l'image précédente. */
export async function setCategoryImage(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = idSchema.safeParse(formData.get("activityId"));
  if (!id.success) back("Catégorie introuvable.", "erreur", "categories");
  const activity = await prisma.activity.findUnique({ where: { id: id.data }, select: { id: true, label: true, imageUrl: true } });
  if (!activity) back("Catégorie introuvable.", "erreur", "categories");
  let imageUrl: string;
  try {
    const saved = await saveStoreImage(formData.get("image"), announcementMediaId, { frame: { width: 400, height: 400 } });
    if (!saved) back("Choisissez une image.", "erreur", "categories");
    imageUrl = saved.url;
  } catch (error) {
    if (error instanceof ImageUploadError) back(error.message, "erreur", "categories");
    throw error;
  }
  await prisma.activity.update({ where: { id: activity.id }, data: { imageUrl } });
  if (activity.imageUrl) await deleteStoreImage(activity.imageUrl).catch(() => undefined);
  await logAdminAction(admin.id, { action: "marketplace.category_image", targetType: "marketplace", targetId: activity.id });
  refresh();
  back(`Image de « ${activity.label} » mise à jour.`, "succes", "categories");
}

/** Retire l'image d'une catégorie : son icône s'affiche de nouveau. */
export async function removeCategoryImage(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = idSchema.safeParse(formData.get("activityId"));
  if (!id.success) back("Catégorie introuvable.", "erreur", "categories");
  const activity = await prisma.activity.findUnique({ where: { id: id.data }, select: { id: true, imageUrl: true } });
  if (activity?.imageUrl) {
    await prisma.activity.update({ where: { id: activity.id }, data: { imageUrl: null } });
    await deleteStoreImage(activity.imageUrl).catch(() => undefined);
    await logAdminAction(admin.id, { action: "marketplace.category_image_removed", targetType: "marketplace", targetId: activity.id });
  }
  refresh();
  back("Image retirée.", "succes", "categories");
}

const tickerSchema = z.object({
  text: z.string().trim().min(3, "Écrivez un texte d’au moins 3 caractères.").max(140, "140 caractères au plus."),
  linkUrl: linkSchema,
});

/** Ajoute un texte au bandeau publicitaire (en dernière position). */
export async function addTicker(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const fields = tickerSchema.safeParse({ text: formData.get("text") ?? "", linkUrl: formData.get("linkUrl") ?? "" });
  if (!fields.success) back(fields.error.issues[0]?.message ?? "Vérifiez le texte.", "erreur");
  const count = await prisma.marketplaceTicker.count();
  if (count >= maxTickers) back(`${maxTickers} textes au plus : supprimez-en un d’abord.`, "erreur");
  const created = await prisma.marketplaceTicker.create({ data: { ...fields.data, position: count } });
  await logAdminAction(admin.id, { action: "marketplace.ticker_create", targetType: "marketplace", targetId: created.id });
  refresh();
  back("Texte ajouté au bandeau.");
}

export async function removeTicker(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) back("Texte introuvable.", "erreur");
  await prisma.marketplaceTicker.deleteMany({ where: { id: id.data } });
  await logAdminAction(admin.id, { action: "marketplace.ticker_delete", targetType: "marketplace", targetId: id.data });
  refresh();
  back("Texte retiré du bandeau.");
}

export async function toggleTicker(formData: FormData) {
  await requirePlatformAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) back("Texte introuvable.", "erreur");
  const row = await prisma.marketplaceTicker.findUnique({ where: { id: id.data }, select: { active: true } });
  if (row) await prisma.marketplaceTicker.update({ where: { id: id.data }, data: { active: !row.active } });
  refresh();
  back(row?.active ? "Texte masqué." : "Texte affiché.");
}

/** Durée d'affichage de chaque texte du bandeau publicitaire (2 à 15 secondes). */
export async function setTickerSeconds(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const seconds = z.coerce.number().int().min(2).max(15).safeParse(formData.get("seconds"));
  if (!seconds.success) back("Choisissez une durée entre 2 et 15 secondes.", "erreur");
  await prisma.marketplaceSettings.upsert({ where: { id: "shop" }, update: { tickerSeconds: seconds.data }, create: { id: "shop", tickerSeconds: seconds.data } });
  await logAdminAction(admin.id, { action: "marketplace.ticker_seconds", targetType: "marketplace", targetId: "shop", details: { seconds: seconds.data } });
  refresh();
  back(`Chaque texte du bandeau s’affiche maintenant ${seconds.data} secondes.`);
}
