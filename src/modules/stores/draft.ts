import "server-only";

import type { Prisma, StoreTheme } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Boutique en cours de création (assistant /boutiques/nouvelle).
 * Aucune boutique n'est créée tant que l'assistant n'est pas terminé : chaque étape enregistre ses
 * réponses dans un brouillon (table StoreDraft). La dernière étape crée la boutique avec l'identifiant
 * du brouillon, puis supprime le brouillon.
 */
export type DraftData = {
  name?: string;
  slug?: string;
  activityId?: string | null;
  activityOther?: string | null;
  activityLabel?: string;
  /** Description de la boutique (facultative), affichée en haut de la vitrine. */
  description?: string | null;
  country?: string;
  region?: string;
  city?: string;
  neighborhood?: string | null;
  phone?: { country: string; national: string; e164: string };
  whatsapp?: { country: string; national: string; e164: string };
  contactEmail?: string | null;
  theme?: StoreTheme;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string | null;
  product?: { name: string; priceXaf: number; photos: { key: string; alt?: string }[] } | null;
  /** L'étape « Premier produit » a été vue (produit ajouté ou étape passée). */
  productStepDone?: boolean;
  /** Étape « Livraison » (facultative) : zones à frais fixes et retrait en boutique. */
  deliveryZones?: { name: string; feeXaf: number; estimatedDelay: string | null }[];
  pickupEnabled?: boolean;
  pickupAddress?: string | null;
  pickupHours?: string | null;
  deliveryStepDone?: boolean;
};

export type StoreDraftRecord = { id: string; userId: string; step: number; data: DraftData; updatedAt: Date };

const toRecord = (draft: { id: string; userId: string; step: number; data: Prisma.JsonValue; updatedAt: Date }): StoreDraftRecord => ({
  ...draft,
  data: (draft.data && typeof draft.data === "object" && !Array.isArray(draft.data) ? draft.data : {}) as DraftData,
});

/** Brouillon de l'utilisateur : celui demandé, sinon le plus récent. */
export async function findDraft(userId: string, draftId?: string | null) {
  const draft = await prisma.storeDraft.findFirst({
    where: { userId, ...(draftId ? { id: draftId } : {}) },
    orderBy: { updatedAt: "desc" },
  });
  return draft ? toRecord(draft) : null;
}

/** Crée le brouillon (étape 1). */
export async function createDraft(userId: string, data: DraftData, step: number) {
  return toRecord(await prisma.storeDraft.create({ data: { userId, data: data as Prisma.InputJsonValue, step } }));
}

/** Fusionne des réponses dans le brouillon ; l'étape atteinte ne recule jamais. */
export async function updateDraft(draft: StoreDraftRecord, patch: DraftData, reachedStep: number) {
  return toRecord(
    await prisma.storeDraft.update({
      where: { id: draft.id },
      data: { data: { ...draft.data, ...patch } as Prisma.InputJsonValue, step: Math.max(draft.step, reachedStep) },
    }),
  );
}

/** Nom normalisé pour comparer deux noms de boutique (casse, accents et espaces ignorés). */
export function normalizeStoreName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Règle : plusieurs boutiques peuvent porter le même nom dans PrestAfrik, mais un utilisateur ne peut pas
 * être propriétaire de deux boutiques du même nom. Retourne la boutique en conflit, s'il y en a une.
 */
export async function findOwnedStoreWithSameName(userId: string, name: string, exceptStoreId?: string) {
  const owned = await prisma.store.findMany({
    where: { memberships: { some: { userId, role: "OWNER" } }, ...(exceptStoreId ? { id: { not: exceptStoreId } } : {}) },
    select: { id: true, name: true },
  });
  const wanted = normalizeStoreName(name);
  return owned.find((store) => normalizeStoreName(store.name) === wanted) ?? null;
}

/** Ce qui manque au brouillon pour créer la boutique, avec l'étape où le compléter. */
export function draftMissing(data: DraftData) {
  const missing: { label: string; step: number }[] = [];
  if (!data.name || !data.slug) missing.push({ label: "le nom et l’adresse de la boutique", step: 1 });
  if (!data.activityId && !data.activityOther) missing.push({ label: "votre activité", step: 2 });
  if (!data.city) missing.push({ label: "la ville de la boutique", step: 3 });
  if (!data.phone) missing.push({ label: "le téléphone de la boutique", step: 4 });
  return missing;
}
