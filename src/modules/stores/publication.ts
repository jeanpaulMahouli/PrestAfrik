import "server-only";

import { prisma } from "@/lib/prisma";
import { isStoreSubscriptionPaused } from "@/modules/subscriptions/service";

// Conditions de publication d'une boutique (brief §6.3). La liste de ce qui manque est affichée au
// vendeur ; la publication est refusée côté serveur tant qu'elle n'est pas vide.

export type PublicationItem = { key: string; label: string; done: boolean; href: string };

export async function getPublicationChecklist(storeId: string, emailVerified: boolean): Promise<PublicationItem[]> {
  const [store, activeProducts, activeZones, subscription] = await Promise.all([
    prisma.store.findUniqueOrThrow({
      where: { id: storeId },
      select: { name: true, slug: true, activityId: true, activityOther: true, businessCategory: true, city: true, phoneE164: true, contactPhone: true, theme: true, pickupEnabled: true },
    }),
    prisma.product.count({ where: { storeId, status: "ACTIVE" } }),
    prisma.deliveryZone.count({ where: { storeId, isActive: true, feeXaf: { not: null } } }),
    prisma.subscription.findUnique({ where: { storeId }, select: { status: true, trialEndsAt: true, currentPeriodEnd: true } }),
  ]);
  return [
    { key: "name", label: "Nom et adresse de la boutique", done: Boolean(store.name && store.slug), href: "/dashboard/boutique#informations" },
    { key: "activity", label: "Activité principale", done: Boolean(store.activityId || store.activityOther || store.businessCategory), href: "/dashboard/boutique#informations" },
    { key: "location", label: "Ville de la boutique", done: Boolean(store.city), href: "/dashboard/boutique#informations" },
    { key: "phone", label: "Téléphone de la boutique", done: Boolean(store.phoneE164 || store.contactPhone), href: "/dashboard/boutique#informations" },
    { key: "theme", label: "Thème", done: Boolean(store.theme), href: "/dashboard/boutique#apparence" },
    { key: "email", label: "Adresse e-mail du compte confirmée", done: emailVerified, href: "/dashboard/profil" },
    { key: "subscription", label: "Essai ou abonnement en cours", done: Boolean(subscription) && !isStoreSubscriptionPaused(subscription), href: "/dashboard/abonnement" },
    { key: "product", label: "Au moins un produit actif", done: activeProducts > 0, href: "/dashboard/produits/nouveau" },
    { key: "delivery", label: "Une zone de livraison avec ses frais, ou le retrait en boutique", done: activeZones > 0 || store.pickupEnabled, href: "/dashboard/livraisons" },
  ];
}

/** Publie la boutique si toutes les conditions sont remplies (dont une zone à frais fixes ou le retrait). */
export async function publishStoreIfReady(storeId: string, emailVerified: boolean) {
  const checklist = await getPublicationChecklist(storeId, emailVerified);
  const missing = checklist.filter((item) => !item.done);
  if (missing.length) return { ok: false as const, missing };
  await prisma.store.update({ where: { id: storeId }, data: { isPublished: true, publishedAt: new Date(), onboardingStep: null } });
  return { ok: true as const };
}
