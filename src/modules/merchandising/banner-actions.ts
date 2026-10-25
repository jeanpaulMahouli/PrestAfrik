"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ImageUploadError, deleteStoreImage, saveStoreImage } from "@/lib/uploads";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { linkBelongsToStore, merchandisingContext } from "@/modules/merchandising/server";
import { bannerFieldsSchema, bannerFrame, bannerLimitMessage, linkFields, maxBanners } from "@/modules/merchandising/validation";

export type BannerActionState = null | { ok: boolean; message: string };

const forbidden = { ok: false, message: "Vous n’avez pas l’autorisation de modifier la boutique." } as const;
const idSchema = z.string().min(1).max(40);

function refresh(store: { id: string; slug: string }) {
  revalidatePath("/dashboard/boutique/banniere");
  revalidatePath(`/${store.slug}`);
  invalidateStorefrontCache(store.id, store.slug);
}

function readFields(formData: FormData) {
  return bannerFieldsSchema.safeParse({ altText: formData.get("altText") ?? "", ...linkFields(formData) });
}

const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Vérifiez les informations saisies.";

export async function addBanner(_previous: BannerActionState, formData: FormData): Promise<BannerActionState> {
  const context = await merchandisingContext();
  if (!context) return forbidden;
  const fields = readFields(formData);
  if (!fields.success) return { ok: false, message: firstIssue(fields.error) };
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choisissez une image à ajouter." };
  if ((await prisma.storeBanner.count({ where: { storeId: context.store.id } })) >= maxBanners) return { ok: false, message: bannerLimitMessage };
  if (!(await linkBelongsToStore(context.store.id, fields.data))) return { ok: false, message: "Ce produit ou cette catégorie n’existe plus. Choisissez-en un autre." };

  let imageUrl: string;
  try {
    imageUrl = (await saveStoreImage(file, context.store.id, { frame: bannerFrame }))!.url;
  } catch (error) {
    if (error instanceof ImageUploadError) return { ok: false, message: error.message };
    throw error;
  }

  // Compte revérifié dans la transaction : deux envois simultanés ne dépassent pas la limite.
  const created = await prisma.$transaction(async (transaction) => {
    const count = await transaction.storeBanner.count({ where: { storeId: context.store.id } });
    if (count >= maxBanners) return false;
    await transaction.storeBanner.create({
      data: {
        storeId: context.store.id,
        imageUrl,
        altText: fields.data.altText || `${context.store.name} : image ${count + 1} de la bannière`,
        position: count,
        linkType: fields.data.linkType,
        categoryId: fields.data.categoryId,
        productId: fields.data.productId,
      },
    });
    return true;
  });
  if (!created) {
    await deleteStoreImage(imageUrl);
    return { ok: false, message: bannerLimitMessage };
  }
  refresh(context.store);
  return { ok: true, message: "Image ajoutée à la bannière. Elle est déjà visible dans votre boutique." };
}

export async function updateBanner(_previous: BannerActionState, formData: FormData): Promise<BannerActionState> {
  const context = await merchandisingContext();
  if (!context) return forbidden;
  const id = idSchema.safeParse(formData.get("id"));
  const fields = readFields(formData);
  if (!id.success) return { ok: false, message: "Image introuvable. Rechargez la page." };
  if (!fields.success) return { ok: false, message: firstIssue(fields.error) };
  const banner = await prisma.storeBanner.findFirst({ where: { id: id.data, storeId: context.store.id } });
  if (!banner) return { ok: false, message: "Cette image n’existe plus. Rechargez la page." };
  if (!(await linkBelongsToStore(context.store.id, fields.data))) return { ok: false, message: "Ce produit ou cette catégorie n’existe plus. Choisissez-en un autre." };

  let imageUrl: string | undefined;
  try {
    imageUrl = (await saveStoreImage(formData.get("image"), context.store.id, { frame: bannerFrame }))?.url;
  } catch (error) {
    if (error instanceof ImageUploadError) return { ok: false, message: error.message };
    throw error;
  }
  await prisma.storeBanner.update({
    where: { id: banner.id },
    data: {
      ...(imageUrl ? { imageUrl } : {}),
      altText: fields.data.altText || banner.altText,
      linkType: fields.data.linkType,
      categoryId: fields.data.categoryId,
      productId: fields.data.productId,
    },
  });
  if (imageUrl) await deleteStoreImage(banner.imageUrl);
  refresh(context.store);
  return { ok: true, message: imageUrl ? "Image remplacée et enregistrée." : "Modifications enregistrées." };
}

export async function deleteBanner(formData: FormData) {
  const context = await merchandisingContext();
  if (!context) return;
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const banner = await prisma.storeBanner.findFirst({ where: { id: id.data, storeId: context.store.id } });
  if (!banner) return;
  await prisma.$transaction(async (transaction) => {
    await transaction.storeBanner.delete({ where: { id: banner.id } });
    const rest = await transaction.storeBanner.findMany({ where: { storeId: context.store.id }, orderBy: { position: "asc" }, select: { id: true } });
    for (const [position, item] of rest.entries()) await transaction.storeBanner.update({ where: { id: item.id }, data: { position } });
  });
  await deleteStoreImage(banner.imageUrl);
  refresh(context.store);
}

/** Nouvel ordre après un glisser-déposer : la liste doit contenir exactement les images de la boutique. */
export async function reorderBanners(ids: string[]): Promise<BannerActionState> {
  const context = await merchandisingContext();
  if (!context) return forbidden;
  const parsed = z.array(idSchema).max(maxBanners).safeParse(ids);
  if (!parsed.success) return { ok: false, message: "Ordre invalide. Rechargez la page." };
  const existing = await prisma.storeBanner.findMany({ where: { storeId: context.store.id }, select: { id: true } });
  const known = new Set(existing.map((item) => item.id));
  if (parsed.data.length !== known.size || new Set(parsed.data).size !== known.size || parsed.data.some((id) => !known.has(id))) {
    return { ok: false, message: "La bannière a changé entre-temps. Rechargez la page." };
  }
  await prisma.$transaction(parsed.data.map((id, position) => prisma.storeBanner.update({ where: { id }, data: { position } })));
  refresh(context.store);
  return { ok: true, message: "Nouvel ordre enregistré." };
}
