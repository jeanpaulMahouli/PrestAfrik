"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ImageUploadError, deleteStoreImage, saveStoreImage } from "@/lib/uploads";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { linkBelongsToStore, merchandisingContext } from "@/modules/merchandising/server";
import { linkFields, popupFieldsSchema, popupFrame } from "@/modules/merchandising/validation";

export type PopupActionState = null | { ok: boolean; message: string };

const forbidden = { ok: false, message: "Vous n’avez pas l’autorisation de modifier la boutique." } as const;
const listPath = "/dashboard/marketing/popups";
const activationNotice = " Il est maintenant le seul popup actif : les autres ont été désactivés automatiquement.";

function refresh(store: { id: string; slug: string }) {
  revalidatePath(listPath);
  revalidatePath(`/${store.slug}`);
  invalidateStorefrontCache(store.id, store.slug);
}

function readFields(formData: FormData) {
  const text = (key: string) => (typeof formData.get(key) === "string" ? (formData.get(key) as string) : "");
  return popupFieldsSchema.safeParse({
    title: text("title"),
    altText: text("altText"),
    isActive: formData.get("isActive") === "on",
    startsAt: text("startsAt"),
    endsAt: text("endsAt"),
    ...linkFields(formData),
  });
}

const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Vérifiez les informations saisies.";

/** Crée (sans id) ou modifie un popup. Activer un popup désactive tous les autres de la boutique. */
export async function savePopup(_previous: PopupActionState, formData: FormData): Promise<PopupActionState> {
  const context = await merchandisingContext("marketing.manage");
  if (!context) return forbidden;
  const storeId = context.store.id;
  const fields = readFields(formData);
  if (!fields.success) return { ok: false, message: firstIssue(fields.error) };
  if (!(await linkBelongsToStore(storeId, fields.data))) return { ok: false, message: "Ce produit ou cette catégorie n’existe plus. Choisissez-en un autre." };

  const rawId = formData.get("id");
  const existing = typeof rawId === "string" && rawId ? await prisma.storePopup.findFirst({ where: { id: rawId, storeId } }) : null;
  if (rawId && !existing) return { ok: false, message: "Ce popup n’existe plus. Rechargez la page." };
  const file = formData.get("image");
  if (!existing && (!(file instanceof File) || file.size === 0)) return { ok: false, message: "Choisissez l’image du popup." };
  // Un seul popup par boutique : on modifie celui qui existe.
  if (!existing && (await prisma.storePopup.count({ where: { storeId } })) > 0) return { ok: false, message: "Votre boutique a déjà un popup : modifiez-le plutôt que d’en créer un autre." };

  let imageUrl: string | undefined;
  try {
    imageUrl = (await saveStoreImage(file, storeId, { frame: popupFrame }))?.url;
  } catch (error) {
    if (error instanceof ImageUploadError) return { ok: false, message: error.message };
    throw error;
  }

  const { title, altText, isActive, startsAt, endsAt, linkType, categoryId, productId } = fields.data;
  const data = { title, altText: altText || `${context.store.name} : ${title}`, isActive, startsAt, endsAt, linkType, categoryId, productId };
  const othersActive = isActive ? await prisma.storePopup.count({ where: { storeId, isActive: true, ...(existing ? { id: { not: existing.id } } : {}) } }) : 0;
  await prisma.$transaction(async (transaction) => {
    if (isActive) await transaction.storePopup.updateMany({ where: { storeId, isActive: true }, data: { isActive: false } });
    if (existing) await transaction.storePopup.update({ where: { id: existing.id }, data: { ...data, ...(imageUrl ? { imageUrl } : {}) } });
    else await transaction.storePopup.create({ data: { ...data, storeId, imageUrl: imageUrl! } });
  });
  if (existing && imageUrl) await deleteStoreImage(existing.imageUrl);
  refresh(context.store);
  const base = existing ? "Popup enregistré." : isActive ? "Popup créé et activé : vos visiteurs le verront à l’ouverture de la boutique." : "Popup créé. Activez-le quand vous voulez le montrer à vos visiteurs.";
  return { ok: true, message: base + (othersActive > 0 ? activationNotice : "") };
}

/** Active ou désactive un popup depuis la liste. */
export async function togglePopup(formData: FormData) {
  const context = await merchandisingContext("marketing.manage");
  if (!context) redirect(listPath);
  const id = z.string().min(1).max(40).safeParse(formData.get("id"));
  const activate = formData.get("active") === "1";
  if (!id.success) redirect(listPath);
  const popup = await prisma.storePopup.findFirst({ where: { id: id.data, storeId: context.store.id } });
  if (!popup) redirect(listPath);
  const othersActive = activate ? await prisma.storePopup.count({ where: { storeId: context.store.id, isActive: true, id: { not: popup.id } } }) : 0;
  await prisma.$transaction(async (transaction) => {
    if (activate) await transaction.storePopup.updateMany({ where: { storeId: context.store.id, isActive: true }, data: { isActive: false } });
    await transaction.storePopup.update({ where: { id: popup.id }, data: { isActive: activate } });
  });
  refresh(context.store);
  redirect(`${listPath}?succes=${activate ? (othersActive ? "active-seul" : "active") : "desactive"}`);
}

export async function deletePopup(formData: FormData) {
  const context = await merchandisingContext("marketing.manage");
  if (!context) redirect(listPath);
  const id = z.string().min(1).max(40).safeParse(formData.get("id"));
  if (!id.success) redirect(listPath);
  const popup = await prisma.storePopup.findFirst({ where: { id: id.data, storeId: context.store.id } });
  if (popup) {
    await prisma.storePopup.delete({ where: { id: popup.id } });
    await deleteStoreImage(popup.imageUrl);
    refresh(context.store);
  }
  redirect(`${listPath}?succes=supprime`);
}
