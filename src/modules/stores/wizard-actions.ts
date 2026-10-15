"use server";

import { Prisma, StoreTheme } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { colorReadability } from "@/lib/contrast";
import { parsePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { PhotoError, attachTemporaryPhoto } from "@/lib/product-photos";
import { ImageUploadError, deleteStoreImage, saveStoreImage } from "@/lib/uploads";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { photosSchema, parseJsonField } from "@/modules/catalog/validation";
import { getCities, getRegions, hasGeoData } from "@/modules/geo";
import { publishStoreIfReady } from "@/modules/stores/publication";
import { checkSlug, slugMessages, slugify } from "@/modules/stores/slug";
import { findOwnedStore, requireWizardSession, wizardStepCount } from "@/modules/stores/wizard";
import { addCalendarPeriod } from "@/modules/subscriptions/dates";
import { assertCanCreateProduct, SubscriptionLimitError } from "@/modules/subscriptions/service";

export type WizardState = null | { ok: false; message: string; field?: string };

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const fail = (message: string, field?: string): WizardState => ({ ok: false, message, field });

function goTo(storeId: string, step: number | "publiee"): never {
  redirect(`/boutiques/nouvelle?boutique=${storeId}&etape=${step}`);
}

/** Enregistre la progression : l'étape suivante devient accessible, sans jamais reculer. */
async function advance(storeId: string, completedStep: number) {
  await prisma.$executeRaw`
    UPDATE "Store" SET "onboardingStep" = GREATEST(COALESCE("onboardingStep", 1), ${Math.min(completedStep + 1, wizardStepCount)})
    WHERE "id" = ${storeId} AND "onboardingStep" IS NOT NULL
  `;
}

async function ownedStore(formData: FormData) {
  const session = await requireWizardSession();
  const storeId = text(formData, "storeId");
  const store = storeId ? await findOwnedStore(session.user.id, storeId) : null;
  return { session, store };
}

async function selectStoreCookie(storeId: string) {
  (await cookies()).set("prestafrik-store", storeId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
}

/** Étape 1 : nom et adresse. Crée la boutique en brouillon (avec l'essai d'un mois) au premier passage. */
export async function saveNameStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { session, store } = await ownedStore(formData);
  const name = text(formData, "name");
  const slug = text(formData, "slug").toLowerCase();
  if (name.length < 2 || name.length > 60) return fail("Le nom doit contenir entre 2 et 60 caractères.", "name");
  const issue = checkSlug(slug);
  if (issue) return fail(slugMessages[issue], "slug");
  const taken = await prisma.store.findFirst({ where: { slug, ...(store ? { id: { not: store.id } } : {}) }, select: { id: true } });
  if (taken) return fail(slugMessages.taken, "slug");

  let storeId = store?.id;
  try {
    if (store) {
      await prisma.store.update({ where: { id: store.id }, data: { name, slug } });
      if (store.slug !== slug) invalidateStorefrontCache(store.id, store.slug);
    } else {
      const created = await prisma.$transaction(async (transaction) => {
        const plan = await transaction.plan.findUnique({ where: { code: "BUSINESS" }, select: { id: true } });
        if (!plan) throw new Error("Les offres d’abonnement ne sont pas initialisées. Appliquez les migrations.");
        const now = new Date();
        const newStore = await transaction.store.create({
          data: { name, slug, onboardingStep: 2, isPublished: false, memberships: { create: { userId: session.user.id, role: "OWNER" } } },
        });
        await transaction.subscription.create({
          data: { storeId: newStore.id, planId: plan.id, status: "TRIAL", trialStartedAt: now, trialEndsAt: addCalendarPeriod(now, "MONTHLY") },
        });
        return newStore;
      });
      storeId = created.id;
      await selectStoreCookie(created.id);
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail(slugMessages.taken, "slug");
    throw error;
  }
  await advance(storeId!, 1);
  goTo(storeId!, 2);
}

export async function saveActivityStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { store } = await ownedStore(formData);
  if (!store) redirect("/boutiques/nouvelle");
  const activityId = text(formData, "activityId");
  const activityOther = text(formData, "activityOther");
  if (activityId) {
    const activity = await prisma.activity.findUnique({ where: { id: activityId }, select: { id: true, label: true } });
    if (!activity) return fail("Choisissez une activité dans la liste.", "activityId");
    await prisma.store.update({ where: { id: store.id }, data: { activityId: activity.id, activityOther: null, businessCategory: activity.label } });
  } else {
    if (activityOther.length < 2 || activityOther.length > 80) return fail("Précisez votre activité (2 à 80 caractères).", "activityOther");
    await prisma.store.update({ where: { id: store.id }, data: { activityId: null, activityOther, businessCategory: activityOther } });
  }
  await advance(store.id, 2);
  goTo(store.id, 3);
}

const locationSchema = z.object({
  country: z.string().regex(/^[A-Z]{2}$/, "Choisissez un pays."),
  region: z.string().min(2, "Choisissez ou saisissez une région.").max(80),
  city: z.string().min(2, "Choisissez ou saisissez une ville.").max(80),
  neighborhood: z.string().max(80),
});

export async function saveLocationStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { store } = await ownedStore(formData);
  if (!store) redirect("/boutiques/nouvelle");
  const parsed = locationSchema.safeParse({ country: text(formData, "country"), region: text(formData, "region"), city: text(formData, "city"), neighborhood: text(formData, "neighborhood") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Vérifiez la localisation.", String(parsed.error.issues[0]?.path[0] ?? ""));
  const { country, neighborhood } = parsed.data;
  let { region, city } = parsed.data;
  // Liste connue : le code de région est converti en nom, la ville doit appartenir à la région
  // sauf si le vendeur a choisi « Ma ville n'est pas dans la liste ».
  if (hasGeoData(country)) {
    const known = getRegions(country).find((item) => item.code === region || item.name === region);
    if (!known) return fail("Choisissez une région de la liste.", "region");
    region = known.name;
    const freeCity = formData.get("cityFree") === "1";
    if (!freeCity && !getCities(country, known.code).includes(city)) return fail("Choisissez une ville de la liste, ou saisissez-la vous-même.", "city");
    city = city.slice(0, 80);
  }
  await prisma.store.update({ where: { id: store.id }, data: { country, region, city, neighborhood: neighborhood || null } });
  await advance(store.id, 3);
  goTo(store.id, 4);
}

export async function saveContactStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { store } = await ownedStore(formData);
  if (!store) redirect("/boutiques/nouvelle");
  const phone = parsePhone(text(formData, "phoneCountry"), text(formData, "phoneNational"));
  if (!phone.ok) return fail(phone.message, "phone");
  const sameWhatsapp = formData.get("sameWhatsapp") === "on";
  const whatsapp = sameWhatsapp ? phone : parsePhone(text(formData, "whatsappCountry"), text(formData, "whatsappNational"));
  if (!whatsapp.ok) return fail(whatsapp.message, "whatsapp");
  const email = text(formData, "contactEmail").toLowerCase();
  if (email && !z.string().email().max(254).safeParse(email).success) return fail("Vérifiez l’adresse e-mail de contact.", "contactEmail");

  await prisma.$transaction([
    prisma.store.update({
      where: { id: store.id },
      data: { phoneCountry: phone.country, phoneNational: phone.national, phoneE164: phone.e164, contactPhone: phone.e164, contactEmail: email || null },
    }),
    prisma.whatsappSettings.upsert({
      where: { storeId: store.id },
      create: { storeId: store.id, businessNumber: whatsapp.e164, businessCountry: whatsapp.country },
      update: { businessNumber: whatsapp.e164, businessCountry: whatsapp.country },
    }),
  ]);
  await advance(store.id, 4);
  goTo(store.id, 5);
}

export async function saveThemeStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { store } = await ownedStore(formData);
  if (!store) redirect("/boutiques/nouvelle");
  const theme = z.nativeEnum(StoreTheme).safeParse(text(formData, "theme"));
  if (!theme.success) return fail("Choisissez un thème.", "theme");
  await prisma.store.update({ where: { id: store.id }, data: { theme: theme.data } });
  await advance(store.id, 5);
  goTo(store.id, 6);
}

const colorSchema = z.string().regex(/^#[\da-f]{6}$/i);

export async function saveBrandingStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { store } = await ownedStore(formData);
  if (!store) redirect("/boutiques/nouvelle");
  const colors = {
    primaryColor: text(formData, "primaryColor").toUpperCase(),
    secondaryColor: text(formData, "secondaryColor").toUpperCase(),
    accentColor: text(formData, "accentColor").toUpperCase(),
  };
  for (const [key, value] of Object.entries(colors)) {
    if (!colorSchema.safeParse(value).success) return fail("Choisissez des couleurs au format #RRGGBB.", key);
    if (key !== "accentColor" && !colorReadability(value).readable) return fail(`La couleur ${value} n’est pas assez lisible.`, key);
  }
  let logoUrl: string | undefined;
  try {
    logoUrl = (await saveStoreImage(formData.get("logo"), store.id, { maxSide: 512, square: true }))?.url;
  } catch (error) {
    if (error instanceof ImageUploadError) return fail(error.message.replace("La photo", "Le logo"), "logo");
    throw error;
  }
  await prisma.store.update({ where: { id: store.id }, data: { ...colors, ...(logoUrl ? { logoUrl } : {}) } });
  if (logoUrl && store.logoUrl) await deleteStoreImage(store.logoUrl);
  await advance(store.id, 6);
  goTo(store.id, 7);
}

/** Étape 7, facultative : premier produit avec jusqu'à 5 photos. */
export async function saveProductStep(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { store } = await ownedStore(formData);
  if (!store) redirect("/boutiques/nouvelle");
  const nothingEntered = !text(formData, "productName") && !text(formData, "productPrice");
  if (formData.get("skip") === "1" || nothingEntered) {
    await advance(store.id, 7);
    goTo(store.id, 8);
  }
  const name = text(formData, "productName");
  const price = text(formData, "productPrice").replace(/[\s  ]/g, "");
  if (name.length < 2 || name.length > 120) return fail("Le nom du produit doit contenir entre 2 et 120 caractères.", "productName");
  if (!/^\d{1,9}$/.test(price)) return fail("Saisissez un nombre entier, sans espace ni virgule.", "productPrice");
  const photos = parseJsonField(formData.get("photos"), photosSchema, []);
  if (!photos.success) return fail(photos.error.issues[0]?.message ?? "Vérifiez les photos.", "photos");

  try {
    await prisma.$transaction(async (transaction) => {
      await assertCanCreateProduct(transaction, store.id);
      const count = await transaction.product.count({ where: { storeId: store.id } });
      const prefix = store.name.normalize("NFKD").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "PRD";
      const baseSlug = slugify(name) || "produit";
      const slugTaken = await transaction.product.findFirst({ where: { storeId: store.id, slug: baseSlug }, select: { id: true } });
      const product = await transaction.product.create({
        data: {
          storeId: store.id,
          name,
          slug: slugTaken ? `${baseSlug}-${count + 1}` : baseSlug,
          sku: `${prefix}-${String(count + 1).padStart(3, "0")}`,
          priceXaf: Number(price),
          status: "ACTIVE",
        },
        select: { id: true },
      });
      const rows = [];
      for (const [position, photo] of photos.data.entries()) {
        if (photo.key) rows.push({ productId: product.id, url: await attachTemporaryPhoto(store.id, product.id, photo.key), altText: photo.alt || name, position });
      }
      if (rows.length) await transaction.productImage.createMany({ data: rows });
    });
  } catch (error) {
    if (error instanceof SubscriptionLimitError) return fail(error.message);
    if (error instanceof PhotoError) return fail(error.message, "photos");
    throw error;
  }
  invalidateStorefrontCache(store.id, store.slug);
  await advance(store.id, 7);
  goTo(store.id, 8);
}

export async function publishFromWizard(_previous: WizardState, formData: FormData): Promise<WizardState> {
  const { session, store } = await ownedStore(formData);
  if (!store) redirect("/boutiques/nouvelle");
  // Frais de livraison dans la ville de la boutique, demandés si aucune zone n'existe encore.
  if (formData.has("deliveryFee")) {
    const fee = text(formData, "deliveryFee").replace(/[\s  ]/g, "");
    if (!/^\d{1,7}$/.test(fee)) return fail("Indiquez les frais de livraison en FCFA (0 si la livraison est gratuite).", "deliveryFee");
    const city = store.city ?? "Ma ville";
    await prisma.deliveryZone.upsert({
      where: { storeId_city_name: { storeId: store.id, city, name: "Toute la ville" } },
      update: { feeXaf: Number(fee), isActive: true, requiresConfirmation: false },
      create: { storeId: store.id, city, name: "Toute la ville", feeXaf: Number(fee), requiresConfirmation: false },
    });
  }
  const result = await publishStoreIfReady(store.id, session.user.emailVerified);
  if (!result.ok) return fail(`Avant de publier : ${result.missing.map((item) => item.label.toLowerCase()).join(", ")}.`);
  await selectStoreCookie(store.id);
  invalidateStorefrontCache(store.id, store.slug);
  redirect(`/boutiques/nouvelle?boutique=${store.id}&etape=publiee`);
}
