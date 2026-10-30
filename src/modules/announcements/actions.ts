"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ImageUploadError, deleteStoreImage, saveStoreImage } from "@/lib/uploads";
import { logAdminAction, requirePlatformAdmin } from "@/modules/admin/context";
import { announcementMediaId } from "@/modules/announcements/queries";

// Administration → Annonces : images affichées en haut du tableau de bord de tous les vendeurs.

const listPath = "/admin/annonces";
/** Formats d'image : diaporama pleine largeur (16:5) et bannière fine (8:1). */
const frames = { CAROUSEL: { width: 1920, height: 600 }, BANNER: { width: 1920, height: 240 } } as const;
const maxPerPlacement = { CAROUSEL: 6, BANNER: 3 } as const;
const idSchema = z.string().min(10).max(40).regex(/^[a-z0-9]+$/);

const fieldsSchema = z.object({
  placement: z.enum(["CAROUSEL", "BANNER"]),
  altText: z.string().trim().min(3, "Décrivez l’image en quelques mots (lecteurs d’écran).").max(160),
  linkUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || /^\/(?!\/)[^\s]*$/.test(value) || /^https:\/\/[^\s]+$/.test(value), "Le lien doit commencer par « / » (page de PrestAfrik) ou « https:// ».")
    .transform((value) => value || null),
});

function back(message: string, kind: "succes" | "erreur" = "succes"): never {
  redirect(`${listPath}?${kind}=${encodeURIComponent(message)}`);
}

function refresh() {
  revalidatePath(listPath);
  revalidatePath("/dashboard");
}

export async function createAnnouncement(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const fields = fieldsSchema.safeParse({ placement: formData.get("placement"), altText: formData.get("altText") ?? "", linkUrl: formData.get("linkUrl") ?? "" });
  if (!fields.success) back(fields.error.issues[0]?.message ?? "Vérifiez les informations.", "erreur");
  const { placement, altText, linkUrl } = fields.data;
  if ((await prisma.platformAnnouncement.count({ where: { placement } })) >= maxPerPlacement[placement]) {
    back(`${maxPerPlacement[placement]} images au plus pour cet emplacement : supprimez-en une d’abord.`, "erreur");
  }
  let imageUrl: string;
  try {
    const saved = await saveStoreImage(formData.get("image"), announcementMediaId, { frame: frames[placement] });
    if (!saved) back("Choisissez une image.", "erreur");
    imageUrl = saved.url;
  } catch (error) {
    if (error instanceof ImageUploadError) back(error.message, "erreur");
    throw error;
  }
  const position = await prisma.platformAnnouncement.count({ where: { placement } });
  const created = await prisma.platformAnnouncement.create({ data: { placement, imageUrl, altText, linkUrl, position } });
  await logAdminAction(admin.id, { action: "announcement.create", targetType: "announcement", targetId: created.id, details: { placement } });
  refresh();
  back("Image ajoutée : elle est déjà visible sur le tableau de bord des vendeurs.");
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
  back(item.active ? "Annonce masquée." : "Annonce de nouveau visible.");
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
  if (target < 0 || target >= siblings.length) back("Déjà à cette place.");
  const order = siblings.map((row) => row.id);
  [order[index], order[target]] = [order[target], order[index]];
  await prisma.$transaction(order.map((rowId, position) => prisma.platformAnnouncement.update({ where: { id: rowId }, data: { position } })));
  refresh();
  back("Ordre mis à jour.");
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
  back("Annonce supprimée.");
}
