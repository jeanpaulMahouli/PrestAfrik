"use server";

import { StoreTheme } from "@prisma/client";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/modules/auth/server";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { addCalendarPeriod } from "@/modules/subscriptions/dates";
import { cameroonCities, storeBusinessCategories, whatsappCountryCodes } from "@/modules/stores/options";

const createStoreSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(80),
  businessCategory: z.enum(storeBusinessCategories),
  city: z.enum(cameroonCities, { message: "Choisis une ville dans la liste." }),
  countryCode: z.string().refine(
    (code) => whatsappCountryCodes.some((country) => country.code === code),
    "Choisis un indicatif de pays valide.",
  ),
  phoneNumber: z.string()
    .trim()
    .max(30)
    .refine((value) => !value || /^[0-9\s().-]+$/.test(value), "Saisis un numéro WhatsApp valide.")
    .transform((value) => value.replace(/\D/g, "").replace(/^0+/, ""))
    .refine((value) => !value || /^[1-9]\d{5,13}$/.test(value), "Vérifie le numéro WhatsApp."),
  theme: z.nativeEnum(StoreTheme),
}).transform(({ countryCode, phoneNumber, ...storeData }) => ({
  ...storeData,
  contactPhone: phoneNumber ? `${countryCode}${phoneNumber}` : null,
}));

function createSlug(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function createStore(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");

  const parsed = createStoreSchema.safeParse({
    name: formData.get("name"),
    businessCategory: formData.get("businessCategory"),
    city: formData.get("city"),
    countryCode: formData.get("countryCode"),
    phoneNumber: formData.get("phoneNumber") ?? "",
    theme: formData.get("theme"),
  });

  if (!parsed.success) {
    redirect(`/boutiques/nouvelle?erreur=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Vérifie les champs.")}`);
  }

  const baseSlug = createSlug(parsed.data.name);
  if (!baseSlug) redirect("/boutiques/nouvelle?erreur=Choisis%20un%20nom%20de%20boutique%20valide.");

  const existingStore = await prisma.store.findUnique({ where: { slug: baseSlug } });
  const slug = existingStore ? `${baseSlug}-${crypto.randomUUID().slice(0, 6)}` : baseSlug;

  const store = await prisma.$transaction(async (transaction) => {
    const trialPlan = await transaction.plan.findUnique({
      where: { code: "BUSINESS" },
      select: { id: true },
    });
    if (!trialPlan) {
      throw new Error("Les offres d’abonnement ne sont pas initialisées. Applique les migrations de base.");
    }
    const created = await transaction.store.create({
      data: {
        ...parsed.data,
        slug,
        memberships: { create: { userId: session.user.id, role: "OWNER" } },
      },
    });
    await transaction.subscription.create({
      data: {
        storeId: created.id,
        planId: trialPlan.id,
        status: "TRIAL",
        trialStartedAt: created.createdAt,
        trialEndsAt: addCalendarPeriod(created.createdAt, "MONTHLY"),
      },
    });

    return created;
  });

  (await cookies()).set("prestafrik-store", store.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  invalidateStorefrontCache(store.id, store.slug);
  redirect("/dashboard");
}

export async function selectStore(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");

  const storeId = formData.get("storeId");
  if (typeof storeId !== "string" || storeId.length === 0) redirect("/dashboard");

  const membership = await prisma.storeMembership.findUnique({
    where: { storeId_userId: { storeId, userId: session.user.id } },
    select: { storeId: true },
  });
  if (!membership) throw new Error("Cette boutique ne fait pas partie de ton espace.");

  (await cookies()).set("prestafrik-store", membership.storeId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  redirect("/dashboard");
}
