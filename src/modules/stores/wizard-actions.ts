"use server";

import { Prisma, StoreTheme } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { colorReadability } from "@/lib/contrast";
import { parsePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { PhotoError, attachedPhotoUrl, checkTemporaryPhotos, moveTemporaryPhotos, tmpKeyPattern } from "@/lib/product-photos";
import { ImageUploadError, deleteStoreImage, saveStoreImage } from "@/lib/uploads";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { photosSchema, parseJsonField } from "@/modules/catalog/validation";
import { getCities, getRegions, hasGeoData } from "@/modules/geo";
import { createDraft, draftMissing, findDraft, findOwnedStoreWithSameName, updateDraft, type DraftData, type StoreDraftRecord } from "@/modules/stores/draft";
import { publishStoreIfReady } from "@/modules/stores/publication";
import { checkSlug, slugMessages, slugify } from "@/modules/stores/slug";
import { requireWizardSession, wizardStepHref } from "@/modules/stores/wizard";
import { addCalendarPeriod } from "@/modules/subscriptions/dates";

// Assistant de création (/boutiques/nouvelle). Chaque étape enregistre ses réponses dans un brouillon
// (StoreDraft) : AUCUNE boutique n'est créée avant la dernière étape. Voir src/modules/stores/draft.ts.

export type WizardState = null | { ok: false; message: string; field?: string };

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const fail = (message: string, field?: string): WizardState => ({ ok: false, message, field });

/** Brouillon de l'utilisateur désigné par le formulaire (champ caché « draftId »). */
async function currentDraft(formData: FormData) {
  const session = await requireWizardSession();
  const draftId = text(formData, "draftId");
  const draft = draftId ? await findDraft(session.user.id, draftId) : null;
  return { session, draft };
}

/** Enregistre les réponses d'une étape, puis passe à la suivante. */
async function saveAndContinue(draft: StoreDraftRecord, patch: DraftData, completedStep: number): Promise<never> {
  await updateDraft(draft, patch, completedStep + 1);
  redirect(wizardStepHref(draft.id, completedStep + 1));
}

const missingDraft = (): never => redirect("/boutiques/nouvelle");

/* ---------- 1. Nom et adresse ---------- */

export async function saveNameStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { session, draft } = await currentDraft(formData);
  const name = text(formData, "name").replace(/\s+/g, " ");
  const slug = text(formData, "slug").toLowerCase();
  if (name.length < 2 || name.length > 60) return fail("Le nom de la boutique doit contenir entre 2 et 60 caractères.", "name");
  const sameName = await findOwnedStoreWithSameName(session.user.id, name);
  if (sameName) {
    return fail(`Vous avez déjà une boutique nommée « ${sameName.name} ». Choisissez un autre nom pour celle-ci (par exemple en ajoutant votre ville).`, "name");
  }
  const issue = checkSlug(slug);
  if (issue) return fail(slugMessages[issue], "slug");
  const taken = await prisma.store.findUnique({ where: { slug }, select: { id: true } });
  if (taken) return fail(slugMessages.taken, "slug");

  if (draft) await saveAndContinue(draft, { name, slug }, 1);
  const created = await createDraft(session.user.id, { name, slug }, 2);
  redirect(wizardStepHref(created.id, 2));
}

/* ---------- 2. Activité ---------- */

export async function saveActivityStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { draft } = await currentDraft(formData);
  if (!draft) return missingDraft();
  const activityId = text(formData, "activityId");
  const activityOther = text(formData, "activityOther");
  if (activityId) {
    const activity = await prisma.activity.findUnique({ where: { id: activityId }, select: { id: true, label: true } });
    if (!activity) return fail("Cette activité n’existe pas dans la liste. Choisissez-en une autre, ou précisez la vôtre.", "activityId");
    return saveAndContinue(draft, { activityId: activity.id, activityOther: null, activityLabel: activity.label }, 2);
  }
  if (activityOther.length < 2 || activityOther.length > 80) {
    return fail("Choisissez une activité dans la liste, ou décrivez la vôtre en quelques mots (2 à 80 caractères).", activityOther ? "activityOther" : "activityId");
  }
  return saveAndContinue(draft, { activityId: null, activityOther, activityLabel: activityOther }, 2);
}

/* ---------- 3. Localisation ---------- */

const locationSchema = z.object({
  country: z.string().regex(/^[A-Z]{2}$/, "Choisissez le pays de votre boutique."),
  region: z.string().min(2, "Choisissez la région de votre boutique, ou saisissez-la.").max(80),
  city: z.string().min(2, "Choisissez la ville de votre boutique, ou saisissez-la.").max(80),
  neighborhood: z.string().max(80),
});

export async function saveLocationStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { draft } = await currentDraft(formData);
  if (!draft) return missingDraft();
  const parsed = locationSchema.safeParse({ country: text(formData, "country"), region: text(formData, "region"), city: text(formData, "city"), neighborhood: text(formData, "neighborhood") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Vérifiez la localisation.", String(parsed.error.issues[0]?.path[0] ?? ""));
  const { country, neighborhood } = parsed.data;
  let { region, city } = parsed.data;
  // Liste connue : le code de région est converti en nom, la ville doit appartenir à la région
  // sauf si le vendeur a choisi « Ma ville n'est pas dans la liste ».
  if (hasGeoData(country)) {
    const known = getRegions(country).find((item) => item.code === region || item.name === region);
    if (!known) return fail("Choisissez une région dans la liste.", "region");
    region = known.name;
    const freeCity = formData.get("cityFree") === "1";
    if (!freeCity && !getCities(country, known.code).includes(city)) {
      return fail("Cette ville n’est pas dans la liste de la région choisie. Choisissez-la dans la liste, ou touchez « Ma ville n’est pas dans la liste ».", "city");
    }
    city = city.slice(0, 80);
  }
  return saveAndContinue(draft, { country, region, city, neighborhood: neighborhood || null }, 3);
}

/* ---------- 4. Coordonnées ---------- */

export async function saveContactStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { draft } = await currentDraft(formData);
  if (!draft) return missingDraft();
  const phone = parsePhone(text(formData, "phoneCountry"), text(formData, "phoneNational"));
  if (!phone.ok) return fail(phone.message, "phone");
  const sameWhatsapp = formData.get("sameWhatsapp") === "on";
  const whatsapp = sameWhatsapp ? phone : parsePhone(text(formData, "whatsappCountry"), text(formData, "whatsappNational"));
  if (!whatsapp.ok) return fail(whatsapp.message, "whatsapp");
  const email = text(formData, "contactEmail").toLowerCase();
  if (email && !z.string().email().max(254).safeParse(email).success) {
    return fail("Cette adresse e-mail de contact n’est pas valide (exemple : contact@maboutique.com). Vous pouvez aussi laisser ce champ vide.", "contactEmail");
  }
  return saveAndContinue(
    draft,
    {
      phone: { country: phone.country, national: phone.national, e164: phone.e164 },
      whatsapp: { country: whatsapp.country, national: whatsapp.national, e164: whatsapp.e164 },
      contactEmail: email || null,
    },
    4,
  );
}

/* ---------- 5. Thème ---------- */

export async function saveThemeStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { draft } = await currentDraft(formData);
  if (!draft) return missingDraft();
  const theme = z.nativeEnum(StoreTheme).safeParse(text(formData, "theme"));
  if (!theme.success) return fail("Choisissez l’un des trois thèmes pour continuer.", "theme");
  return saveAndContinue(draft, { theme: theme.data }, 5);
}

/* ---------- 6. Couleurs et logo ---------- */

const colorSchema = z.string().regex(/^#[\da-f]{6}$/i);

export async function saveBrandingStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { draft } = await currentDraft(formData);
  if (!draft) return missingDraft();
  const colors = {
    primaryColor: text(formData, "primaryColor").toUpperCase(),
    secondaryColor: text(formData, "secondaryColor").toUpperCase(),
    accentColor: text(formData, "accentColor").toUpperCase(),
  };
  for (const [key, value] of Object.entries(colors)) {
    if (!colorSchema.safeParse(value).success) return fail("Choisissez des couleurs au format #RRGGBB.", key);
    if (key !== "accentColor" && !colorReadability(value).readable) {
      return fail(`La couleur ${value} rendrait les textes difficiles à lire. Choisissez une couleur plus foncée ou plus claire.`, key);
    }
  }
  let logoUrl: string | undefined;
  try {
    // Le logo est rangé sous l'identifiant du brouillon, qui deviendra celui de la boutique.
    logoUrl = (await saveStoreImage(formData.get("logo"), draft.id, { maxSide: 512, square: true }))?.url;
  } catch (error) {
    if (error instanceof ImageUploadError) return fail(error.message.replace("La photo", "Le logo"), "logo");
    throw error;
  }
  if (logoUrl && draft.data.logoUrl) await deleteStoreImage(draft.data.logoUrl);
  return saveAndContinue(draft, { ...colors, ...(logoUrl ? { logoUrl } : {}) }, 6);
}

/* ---------- 7. Premier produit (facultatif) ---------- */

export async function saveProductStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { draft } = await currentDraft(formData);
  if (!draft) return missingDraft();
  const name = text(formData, "productName");
  const price = text(formData, "productPrice").replace(/[\s  ]/g, "");
  if (formData.get("skip") === "1" || (!name && !price)) return saveAndContinue(draft, { product: null, productStepDone: true }, 7);
  if (name.length < 2 || name.length > 120) return fail("Donnez un nom à votre produit (2 à 120 caractères), ou touchez « Passer cette étape ».", "productName");
  if (!/^\d{1,9}$/.test(price)) return fail("Indiquez le prix en FCFA, en chiffres uniquement (ex. 18000), sans espace ni virgule.", "productPrice");
  const photos = parseJsonField(formData.get("photos"), photosSchema, []);
  if (!photos.success) return fail(photos.error.issues[0]?.message ?? "Vérifiez les photos.", "photos");
  // Les photos déjà envoyées gardent leur clé provisoire (tmp/…) : elles sont rattachées à la création de la boutique.
  const keys = photos.data.flatMap((photo) => {
    const key = photo.key ?? photo.id ?? "";
    return tmpKeyPattern.test(key) ? [{ key, alt: photo.alt || undefined }] : [];
  });
  try {
    await checkTemporaryPhotos(draft.id, keys.map((photo) => photo.key));
  } catch (error) {
    if (error instanceof PhotoError) return fail(error.message, "photos");
    throw error;
  }
  return saveAndContinue(draft, { product: { name, priceXaf: Number(price), photos: keys }, productStepDone: true }, 7);
}

/* ---------- 8. Création (et publication) de la boutique ---------- */

async function selectStoreCookie(storeId: string) {
  (await cookies()).set("prestafrik-store", storeId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
}

export async function finishWizard(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { session, draft } = await currentDraft(formData);
  if (!draft) return missingDraft();
  const data = draft.data;
  const missing = draftMissing(data);
  if (missing.length) return fail(`Il manque encore ${missing.map((item) => item.label).join(", ")}. Touchez « Modifier » sur la ligne concernée pour compléter.`);
  const sameName = await findOwnedStoreWithSameName(session.user.id, data.name!);
  if (sameName) return fail(`Vous avez déjà une boutique nommée « ${sameName.name} ». Revenez à l’étape 1 pour choisir un autre nom.`);
  if (await prisma.store.findUnique({ where: { slug: data.slug! }, select: { id: true } })) {
    return fail(`L’adresse prestafrik.com/${data.slug} vient d’être prise par une autre boutique. Revenez à l’étape 1 pour en choisir une autre.`);
  }
  const photoKeys = data.product?.photos.map((photo) => photo.key) ?? [];
  try {
    await checkTemporaryPhotos(draft.id, photoKeys);
  } catch (error) {
    if (error instanceof PhotoError) return fail("Une photo du premier produit a expiré (plus de 24 h). Revenez à l’étape 7 pour l’ajouter de nouveau, ou retirez-la.");
    throw error;
  }

  const storeId = draft.id;
  let productId: string | null = null;
  try {
    await prisma.$transaction(async (transaction) => {
      const plan = await transaction.plan.findUnique({ where: { code: "BUSINESS" }, select: { id: true } });
      if (!plan) throw new Error("Les offres d’abonnement ne sont pas initialisées. Appliquez les migrations.");
      const now = new Date();
      await transaction.store.create({
        data: {
          id: storeId,
          name: data.name!,
          slug: data.slug!,
          activityId: data.activityId ?? null,
          activityOther: data.activityOther ?? null,
          businessCategory: data.activityLabel ?? data.activityOther ?? null,
          country: data.country ?? "CM",
          region: data.region ?? null,
          city: data.city ?? null,
          neighborhood: data.neighborhood ?? null,
          phoneCountry: data.phone?.country ?? null,
          phoneNational: data.phone?.national ?? null,
          phoneE164: data.phone?.e164 ?? null,
          contactPhone: data.phone?.e164 ?? null,
          contactEmail: data.contactEmail ?? null,
          ...(data.theme ? { theme: data.theme } : {}),
          ...(data.primaryColor ? { primaryColor: data.primaryColor, secondaryColor: data.secondaryColor, accentColor: data.accentColor } : {}),
          logoUrl: data.logoUrl ?? null,
          onboardingStep: null,
          isPublished: false,
          memberships: { create: { userId: session.user.id, role: "OWNER" } },
        },
      });
      await transaction.subscription.create({
        data: { storeId, planId: plan.id, status: "TRIAL", trialStartedAt: now, trialEndsAt: addCalendarPeriod(now, "MONTHLY") },
      });
      if (data.whatsapp) {
        await transaction.whatsappSettings.create({ data: { storeId, businessNumber: data.whatsapp.e164, businessCountry: data.whatsapp.country } });
      }
      if (data.product) {
        const prefix = data.name!.normalize("NFKD").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "PRD";
        const product = await transaction.product.create({
          data: { storeId, name: data.product.name, slug: slugify(data.product.name) || "produit", sku: `${prefix}-001`, priceXaf: data.product.priceXaf, status: "ACTIVE" },
          select: { id: true },
        });
        productId = product.id;
        const rows = data.product.photos.map((photo, position) => ({
          productId: product.id,
          url: attachedPhotoUrl(storeId, `products/${product.id}`, photo.key),
          altText: photo.alt || data.product!.name,
          position,
        }));
        if (rows.length) await transaction.productImage.createMany({ data: rows });
      }
      await transaction.storeDraft.delete({ where: { id: draft.id } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(`L’adresse prestafrik.com/${data.slug} vient d’être prise par une autre boutique. Revenez à l’étape 1 pour en choisir une autre.`);
    }
    throw error;
  }
  // Photos déplacées après la transaction (stockage distant : quelques secondes).
  if (productId && photoKeys.length) {
    const failed = await moveTemporaryPhotos(storeId, `products/${productId}`, photoKeys);
    if (failed.length) await prisma.productImage.deleteMany({ where: { productId, url: { in: failed } } });
  }
  await selectStoreCookie(storeId);
  invalidateStorefrontCache(storeId, data.slug!);

  // Publication immédiate si tout est prêt ; sinon la boutique est créée et le vendeur sait quoi faire.
  const result = await publishStoreIfReady(storeId, session.user.emailVerified);
  redirect(`/boutiques/nouvelle?boutique=${storeId}&etape=${result.ok ? "publiee" : "creee"}`);
}

/** Abandonne une boutique en cours de création (brouillon, logo et photos provisoires). */
export async function discardDraft(formData: FormData) {
  const { draft } = await currentDraft(formData);
  if (draft) {
    if (draft.data.logoUrl) await deleteStoreImage(draft.data.logoUrl);
    const { deleteProductPhoto } = await import("@/lib/product-photos");
    await Promise.all((draft.data.product?.photos ?? []).map((photo) => deleteProductPhoto(attachedPhotoUrl(draft.id, "tmp", photo.key))));
    await prisma.storeDraft.delete({ where: { id: draft.id } });
  }
  redirect("/dashboard");
}
