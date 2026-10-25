"use server";

import { Prisma, StoreTheme } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { colorReadability } from "@/lib/contrast";
import { parsePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { storeAddressLabel } from "@/lib/urls";
import { PhotoError, attachedPhotoUrl, checkTemporaryPhotos, moveTemporaryPhotos, tmpKeyPattern } from "@/lib/product-photos";
import { ImageUploadError, deleteStoreImage, saveStoreImage } from "@/lib/uploads";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { photosSchema, parseJsonField } from "@/modules/catalog/validation";
import { getCities, getRegions, hasGeoData } from "@/modules/geo";
import { createDraft, draftMissing, findDraft, findOwnedStoreWithSameName, updateDraft, type DraftData, type StoreDraftRecord } from "@/modules/stores/draft";
import { isPlatformAdmin } from "@/modules/admin/context";
import { rememberActiveStore } from "@/modules/stores/context";
import { brandNameMessage, brandSlug, brandSlugMessage, usesBrandName, usesBrandSlug } from "@/modules/stores/brand";
import { publishStoreIfReady } from "@/modules/stores/publication";
import { checkSlug, slugMessages, slugify } from "@/modules/stores/slug";
import { isSlugTaken } from "@/modules/stores/slug-availability";
import { requireVerifiedWizardSession, wizardStepHref } from "@/modules/stores/wizard";
import { addCalendarPeriod } from "@/modules/subscriptions/dates";

// Assistant de création (/boutiques/nouvelle). Chaque étape enregistre ses réponses dans un brouillon
// (StoreDraft) : AUCUNE boutique n'est créée avant la dernière étape. Voir src/modules/stores/draft.ts.

export type WizardState = null | { ok: false; message: string; field?: string };

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const fail = (message: string, field?: string): WizardState => ({ ok: false, message, field });

/** Brouillon de l'utilisateur désigné par le formulaire (champ caché « draftId »). Adresse e-mail confirmée obligatoire. */
async function currentDraft(formData: FormData) {
  const session = await requireVerifiedWizardSession();
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
  // « PrestAfrik » (nom ou adresse) : réservé à l'administrateur de la plateforme.
  const admin = await isPlatformAdmin(session.user.id);
  if (!admin && usesBrandName(name)) return fail(brandNameMessage, "name");
  if (!admin && usesBrandSlug(slug)) return fail(brandSlugMessage, "slug");
  const issue = admin && slug === brandSlug ? null : checkSlug(slug);
  if (issue) return fail(slugMessages[issue], "slug");
  if (await isSlugTaken(slug)) return fail(slugMessages.taken, "slug");

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
  const { country, neighborhood, city } = parsed.data;
  let { region } = parsed.data;
  // Pays, région et ville viennent toujours des listes : aucune saisie libre n'est acceptée.
  if (!hasGeoData(country)) return fail("Choisissez un pays dans la liste.", "country");
  const known = getRegions(country).find((item) => item.code === region || item.name === region);
  if (!known) return fail("Choisissez une région dans la liste.", "region");
  region = known.name;
  if (!getCities(country, known.code).includes(city)) return fail("Choisissez votre ville dans la liste de la région.", "city");
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

/* ---------- 8. Livraison et retrait (facultatif) ---------- */

const zoneSchema = z.object({
  name: z.string().trim().min(2, "Donnez un nom à chaque zone (ex. Akwa, Bonamoussadi).").max(120, "Le nom d’une zone ne peut pas dépasser 120 caractères."),
  feeXaf: z.number().int().min(0, "Les frais ne peuvent pas être négatifs.").max(9_999_999, "Les frais sont trop élevés."),
  estimatedDelay: z.string().trim().max(100, "Le délai ne peut pas dépasser 100 caractères."),
});

export async function saveDeliveryStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { draft } = await currentDraft(formData);
  if (!draft) return missingDraft();
  if (formData.get("skip") === "1") return saveAndContinue(draft, { deliveryStepDone: true }, 8);

  // Zones : lignes « nom / frais / délai » ; une ligne entièrement vide est ignorée.
  const names = formData.getAll("zoneName").map(String);
  const fees = formData.getAll("zoneFee").map(String);
  const delays = formData.getAll("zoneDelay").map(String);
  const zones: NonNullable<DraftData["deliveryZones"]> = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i]?.trim() ?? "";
    const fee = (fees[i] ?? "").replace(/[\s\u00a0\u202f]/g, "");
    const delay = delays[i]?.trim() ?? "";
    if (!name && !fee && !delay) continue;
    if (!/^\d{1,7}$/.test(fee)) return fail(`Indiquez les frais de la zone « ${name || i + 1} » en FCFA, en chiffres (0 si la livraison est gratuite).`, "zones");
    const parsed = zoneSchema.safeParse({ name, feeXaf: Number(fee), estimatedDelay: delay });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Vérifiez vos zones de livraison.", "zones");
    zones.push({ name: parsed.data.name, feeXaf: parsed.data.feeXaf, estimatedDelay: parsed.data.estimatedDelay || null });
  }
  if (zones.length > 20) return fail("Vous pouvez ajouter jusqu’à 20 zones ici ; les autres se règlent ensuite dans « Livraisons ».", "zones");

  const pickupEnabled = formData.get("pickupEnabled") === "on";
  const pickupAddress = text(formData, "pickupAddress").slice(0, 200);
  const pickupHours = text(formData, "pickupHours").slice(0, 120);
  if (pickupEnabled && pickupAddress.length < 3) {
    return fail("Indiquez l’adresse où vos clients viendront chercher leur commande, ou décochez le retrait en boutique.", "pickupAddress");
  }
  return saveAndContinue(
    draft,
    { deliveryZones: zones, pickupEnabled, pickupAddress: pickupEnabled ? pickupAddress : null, pickupHours: pickupEnabled ? pickupHours || null : null, deliveryStepDone: true },
    8,
  );
}

/* ---------- 9. Création (et publication) de la boutique ---------- */

export async function finishWizard(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { session, draft } = await currentDraft(formData);
  if (!draft) return missingDraft();
  const data = draft.data;
  const missing = draftMissing(data);
  if (missing.length) return fail(`Il manque encore ${missing.map((item) => item.label).join(", ")}. Touchez « Modifier » sur la ligne concernée pour compléter.`);
  const sameName = await findOwnedStoreWithSameName(session.user.id, data.name!);
  if (sameName) return fail(`Vous avez déjà une boutique nommée « ${sameName.name} ». Revenez à l’étape 1 pour choisir un autre nom.`);
  if (!(await isPlatformAdmin(session.user.id)) && (usesBrandName(data.name!) || usesBrandSlug(data.slug!))) {
    return fail(`${brandNameMessage} Revenez à l’étape 1 pour le modifier.`);
  }
  if (await isSlugTaken(data.slug!)) {
    return fail(`L’adresse ${storeAddressLabel(data.slug!)} vient d’être prise par une autre boutique. Revenez à l’étape 1 pour en choisir une autre.`);
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
          // Retrait en boutique : celui choisi à l'étape « Livraison » (activé par défaut si l'étape a été passée).
          pickupEnabled: data.pickupEnabled ?? true,
          pickupAddress: data.pickupAddress ?? null,
          pickupHours: data.pickupHours ?? null,
          onboardingStep: null,
          isPublished: false,
          memberships: { create: { userId: session.user.id, role: "OWNER" } },
        },
      });
      await transaction.subscription.create({
        data: { storeId, planId: plan.id, status: "TRIAL", trialStartedAt: now, trialEndsAt: addCalendarPeriod(now, "MONTHLY") },
      });
      if (data.deliveryZones?.length) {
        await transaction.deliveryZone.createMany({
          data: data.deliveryZones.map((zone) => ({ storeId, city: data.city ?? "", name: zone.name, feeXaf: zone.feeXaf, estimatedDelay: zone.estimatedDelay, isActive: true })),
        });
      }
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
      return fail(`L’adresse ${storeAddressLabel(data.slug!)} vient d’être prise par une autre boutique. Revenez à l’étape 1 pour en choisir une autre.`);
    }
    throw error;
  }
  // Photos déplacées après la transaction (stockage distant : quelques secondes).
  if (productId && photoKeys.length) {
    const failed = await moveTemporaryPhotos(storeId, `products/${productId}`, photoKeys);
    if (failed.length) await prisma.productImage.deleteMany({ where: { productId, url: { in: failed } } });
  }
  await rememberActiveStore(session.user.id, session.session.id, storeId);
  invalidateStorefrontCache(storeId, data.slug!);

  // Publication immédiate si tout est prêt (l'adresse e-mail est forcément confirmée) ; sinon le vendeur sait quoi faire.
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
