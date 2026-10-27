"use server";

import { StorePromoStyle, StoreTheme } from "@prisma/client";
import { isKnownCity } from "@/modules/geo";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { colorReadability } from "@/lib/contrast";
import { parsePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { deleteStoreImage, ImageUploadError, saveStoreImage } from "@/lib/uploads";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { hexColorSchema } from "@/modules/catalog/validation";
import { activeStoreCookie, rememberActiveStore, requireStorePermission } from "@/modules/stores/context";
import { storePublicUrl } from "@/lib/urls";
import { isPlatformAdmin } from "@/modules/admin/context";
import { brandNameMessage, brandSlug, usesBrandName } from "@/modules/stores/brand";
import { findOwnedStoreWithSameName } from "@/modules/stores/draft";
import { isSlugTaken } from "@/modules/stores/slug-availability";
import { slugForRenamedStore, type SlugProposal } from "@/modules/stores/slug-rename";
import { publishStoreIfReady } from "@/modules/stores/publication";

const settingsPath = "/dashboard/boutique";

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

function fail(message: string): never {
  redirect(`${settingsPath}?erreur=${encodeURIComponent(message)}`);
}

const settingsSchema = z.object({
  name: z.string().trim().min(2, "Le nom de la boutique doit contenir au moins 2 caractères.").max(60, "Le nom de la boutique ne peut pas dépasser 60 caractères."),
  description: z.string().trim().max(2000, "La description ne peut pas dépasser 2 000 caractères.").refine((value) => !/<[a-z/!]/i.test(value), "La description est un texte simple, sans HTML."),
  activityId: z.string().trim(),
  activityOther: z.string().trim().max(80, "L’activité ne peut pas dépasser 80 caractères."),
  city: z.string().trim().min(2, "Indiquez la ville de la boutique.").max(80),
  neighborhood: z.string().trim().max(80),
  contactEmail: z.union([z.literal(""), z.string().trim().toLowerCase().email("Vérifiez l’adresse e-mail de contact.").max(254)]),
  address: z.string().trim().max(200),
  pickupEnabled: z.boolean(),
  pickupAddress: z.string().trim().max(200),
  pickupHours: z.string().trim().max(120),
  theme: z.nativeEnum(StoreTheme),
  promoStyle: z.nativeEnum(StorePromoStyle),
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  accentColor: hexColorSchema,
});

function revalidateStore(store: { id: string; slug: string }) {
  revalidatePath(settingsPath);
  revalidatePath("/dashboard");
  revalidatePath(`/${store.slug}`);
  invalidateStorefrontCache(store.id, store.slug);
}

export type StoreSettingsState =
  | null
  | { ok: true; message: string; logoUrl: string | null; slug: string; slugNotice: string | null }
  | { ok: false; message: string; field?: string };

/** Enregistre « Ma boutique » sans rechargement : en cas d'erreur, la saisie (logo compris) est conservée. */
export async function updateStoreSettings(_previous: StoreSettingsState, formData: FormData): Promise<StoreSettingsState> {
  const { session, store } = await requireStorePermission("store.manage");
  const parsed = settingsSchema.safeParse({
    name: text(formData, "name"),
    description: text(formData, "description"),
    activityId: text(formData, "activityId"),
    activityOther: text(formData, "activityOther"),
    city: text(formData, "city"),
    neighborhood: text(formData, "neighborhood"),
    contactEmail: text(formData, "contactEmail"),
    address: text(formData, "address"),
    pickupEnabled: formData.get("pickupEnabled") === "on",
    pickupAddress: text(formData, "pickupAddress"),
    pickupHours: text(formData, "pickupHours"),
    theme: text(formData, "theme"),
    promoStyle: text(formData, "promoStyle"),
    primaryColor: text(formData, "primaryColor").toUpperCase(),
    secondaryColor: text(formData, "secondaryColor").toUpperCase(),
    accentColor: text(formData, "accentColor").toUpperCase(),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: issue?.message ?? "Vérifiez vos informations.", field: String(issue?.path[0] ?? "") };
  }
  const input = parsed.data;

  for (const [field, label, color] of [["primaryColor", "principale", input.primaryColor], ["secondaryColor", "secondaire", input.secondaryColor]] as const) {
    if (!colorReadability(color).readable) {
      return { ok: false, field, message: `La couleur ${label} ${color} n’est pas assez contrastée pour rester lisible.` };
    }
  }
  if (input.pickupEnabled && !input.pickupAddress && !input.address) {
    return { ok: false, field: "pickupAddress", message: "Indiquez l’adresse de retrait en boutique, ou décochez le retrait." };
  }
  const phone = text(formData, "phoneNational") ? parsePhone(text(formData, "phoneCountry"), text(formData, "phoneNational")) : null;
  if (phone && !phone.ok) return { ok: false, field: "phone", message: phone.message };
  // La ville se choisit toujours dans la liste du pays de la boutique.
  if (!isKnownCity(store.country, input.city)) return { ok: false, field: "city", message: "Choisissez la ville de votre boutique dans la liste." };
  // Règle : un propriétaire ne peut pas avoir deux boutiques du même nom (d'autres vendeurs, si).
  const owners = await prisma.storeMembership.findMany({ where: { storeId: store.id, role: "OWNER" }, select: { userId: true } });
  for (const owner of owners) {
    const sameName = await findOwnedStoreWithSameName(owner.userId, input.name, store.id);
    if (sameName) return { ok: false, field: "name", message: `Le propriétaire a déjà une autre boutique nommée « ${sameName.name} ». Choisissez un autre nom.` };
  }
  if (input.activityId && !(await prisma.activity.findUnique({ where: { id: input.activityId }, select: { id: true } }))) {
    return { ok: false, field: "activityId", message: "Choisissez une activité de la liste." };
  }

  let logoUrl: string | undefined;
  try {
    logoUrl = (await saveStoreImage(formData.get("logo"), store.id, { maxSide: 512, square: true }))?.url;
  } catch (error) {
    if (error instanceof ImageUploadError) return { ok: false, field: "logo", message: error.message.replace("La photo", "Le logo") };
    throw error;
  }
  const previousLogo = logoUrl ? store.logoUrl : null;

  // Nouveau nom → nouvelle adresse. Une adresse prise (par une autre boutique ou une ancienne adresse
  // conservée en redirection) reçoit « -» et un identifiant court ; le nom, lui, reste tel quel.
  const isTaken = (slug: string) => isSlugTaken(slug, store.id);
  // « PrestAfrik » : nom réservé à l'administrateur de la plateforme (qui peut aussi prendre l'adresse « prestafrik »).
  const admin = await isPlatformAdmin(session.user.id);
  if (input.name !== store.name && usesBrandName(input.name) && !admin) return { ok: false, field: "name", message: brandNameMessage };
  let proposal: SlugProposal | null =
    input.name !== store.name ? await slugForRenamedStore(input.name, store.slug, isTaken, undefined, (slug) => admin && slug === brandSlug) : null;

  const data = {
      name: input.name,
      description: input.description || null,
      activityId: input.activityId || null,
      activityOther: input.activityId ? null : input.activityOther || null,
      city: input.city,
      neighborhood: input.neighborhood || null,
      contactEmail: input.contactEmail || null,
      address: input.address || null,
      pickupEnabled: input.pickupEnabled,
      pickupAddress: input.pickupAddress || input.address || null,
      pickupHours: input.pickupHours || null,
      theme: input.theme,
      promoStyle: input.promoStyle,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      accentColor: input.accentColor,
      ...(phone?.ok ? { phoneCountry: phone.country, phoneNational: phone.national, phoneE164: phone.e164, contactPhone: phone.e164 } : {}),
      ...(logoUrl ? { logoUrl } : {}),
  };
  for (let attempt = 0; ; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        if (proposal) {
          // L'ancienne adresse redirige vers la nouvelle (liens partagés, QR codes imprimés).
          await tx.storeSlugAlias.deleteMany({ where: { slug: proposal.slug, storeId: store.id } });
          await tx.storeSlugAlias.upsert({ where: { slug: store.slug }, create: { slug: store.slug, storeId: store.id }, update: { storeId: store.id } });
        }
        await tx.store.update({ where: { id: store.id }, data: { ...data, ...(proposal ? { slug: proposal.slug } : {}) } });
      });
      break;
    } catch (error) {
      // Adresse prise entre-temps par une autre boutique : on en calcule une autre.
      const conflict = (error as { code?: string })?.code === "P2002";
      if (!proposal || !conflict || attempt >= 2) throw error;
      proposal = await slugForRenamedStore(input.name, store.slug, async (slug) => slug === proposal!.slug || (await isTaken(slug)), undefined, (slug) => admin && slug === brandSlug);
    }
  }
  if (previousLogo) await deleteStoreImage(previousLogo);
  revalidateStore(store);

  let slugNotice: string | null = null;
  if (proposal) {
    const shown = (slug: string) => storePublicUrl(slug).replace(/^https?:\/\//, "");
    revalidateStore({ id: store.id, slug: proposal.slug });
    slugNotice = proposal.suffixed
      ? `Le lien ${shown(proposal.base)} ${proposal.reason === "taken" ? "est déjà utilisé par une autre boutique" : "est réservé par PrestAfrik"}. Nous avons ajouté « -${proposal.slug.slice(proposal.slug.lastIndexOf("-") + 1)} » pour faire la différence : votre nouveau lien est ${shown(proposal.slug)}. Votre nom de boutique, lui, ne change pas. L’ancien lien ${shown(store.slug)} redirige automatiquement vers le nouveau.`
      : `Votre lien suit le nouveau nom : ${shown(proposal.slug)}. L’ancien lien ${shown(store.slug)} redirige automatiquement vers le nouveau.`;
  }
  return {
    ok: true,
    message: "Modifications enregistrées. Votre boutique est à jour.",
    logoUrl: logoUrl ?? store.logoUrl,
    slug: proposal?.slug ?? store.slug,
    slugNotice,
  };
}

export async function removeStoreLogo() {
  const { store } = await requireStorePermission("store.manage");
  if (store.logoUrl) {
    await prisma.store.update({ where: { id: store.id }, data: { logoUrl: null } });
    await deleteStoreImage(store.logoUrl);
  }
  revalidateStore(store);
  redirect(`${settingsPath}?succes=logo-retire`);
}

export async function publishStore() {
  const { session, store } = await requireStorePermission("store.manage");
  const result = await publishStoreIfReady(store.id, session.user.emailVerified);
  if (!result.ok) fail(`Avant de publier : ${result.missing.map((item) => item.label.toLowerCase()).join(", ")}.`);
  revalidateStore(store);
  redirect(`${settingsPath}?succes=publication`);
}

export async function unpublishStore() {
  const { store } = await requireStorePermission("store.manage");
  await prisma.store.update({ where: { id: store.id }, data: { isPublished: false } });
  revalidateStore(store);
  redirect(`${settingsPath}?succes=brouillon`);
}

export type DeleteStoreState = null | { ok: false; message: string };

/**
 * Suppression définitive d'une boutique par son propriétaire, après avoir retapé son nom.
 * Tout est supprimé : produits, commandes, clients, paiements, pages, réglages, images.
 */
export async function deleteStore(_previous: DeleteStoreState, formData: FormData): Promise<DeleteStoreState> {
  const { session, store, membership } = await requireStorePermission("store.manage");
  if (membership.role !== "OWNER") return { ok: false, message: "Seul le propriétaire de la boutique peut la supprimer." };
  if (text(formData, "confirmName").trim() !== store.name) {
    return { ok: false, message: `Pour confirmer, tapez exactement le nom de la boutique : « ${store.name} ».` };
  }

  await prisma.$transaction(async (transaction) => {
    // Paiements et commandes d'abord : ces liens empêchent la suppression en cascade (onDelete: Restrict).
    await transaction.payment.updateMany({ where: { storeId: store.id }, data: { reversesId: null } });
    await transaction.payment.deleteMany({ where: { storeId: store.id } });
    await transaction.order.deleteMany({ where: { storeId: store.id } });
    await transaction.store.delete({ where: { id: store.id } });
  });

  // Images (logo, photos produit, pages) : en dehors de la transaction, sans bloquer en cas d'échec.
  const { storage } = await import("@/lib/storage");
  await Promise.allSettled([storage.deletePrefix(`stores/${store.id}`), storage.deletePrefix(store.id)]);
  invalidateStorefrontCache(store.id, store.slug);

  // Boutique suivante de l'utilisateur, sinon création d'une nouvelle boutique.
  const next = await prisma.storeMembership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { storeId: true } });
  if (next) await rememberActiveStore(session.user.id, session.session.id, next.storeId);
  else (await (await import("next/headers")).cookies()).delete(activeStoreCookie);
  redirect(next ? "/dashboard?succes=boutique-supprimee" : "/boutiques/nouvelle?boutique-supprimee=1");
}
