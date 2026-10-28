import "server-only";

import { billingEnabled } from "@/config/billing";
import { prisma } from "@/lib/prisma";
import { notifyStorePublished } from "@/modules/email/notifications";
import { isStoreSubscriptionPaused } from "@/modules/subscriptions/service";

// Conditions de publication d'une boutique (brief §6.3). La liste de ce qui manque est affichée au
// vendeur ; la publication est refusée côté serveur tant qu'elle n'est pas vide.

export type PublicationItem = { key: string; label: string; done: boolean; href: string };

export async function getPublicationChecklist(storeId: string, accountVerified: boolean): Promise<PublicationItem[]> {
  const [store, activeProducts, activeZones, subscription] = await Promise.all([
    prisma.store.findUniqueOrThrow({
      where: { id: storeId },
      select: { name: true, slug: true, activityId: true, activityOther: true, businessCategory: true, city: true, phoneE164: true, contactPhone: true, theme: true, pickupEnabled: true },
    }),
    prisma.product.count({ where: { storeId, status: "ACTIVE" } }),
    prisma.deliveryZone.count({ where: { storeId, isActive: true, feeXaf: { not: null } } }),
    prisma.subscription.findUnique({ where: { storeId }, select: { status: true, trialEndsAt: true, currentPeriodEnd: true } }),
  ]);
  const items: PublicationItem[] = [
    { key: "name", label: "Nom et adresse de la boutique", done: Boolean(store.name && store.slug), href: "/dashboard/boutique#informations" },
    { key: "activity", label: "Activité principale", done: Boolean(store.activityId || store.activityOther || store.businessCategory), href: "/dashboard/boutique#informations" },
    { key: "location", label: "Ville de la boutique", done: Boolean(store.city), href: "/dashboard/boutique#informations" },
    { key: "phone", label: "Téléphone de la boutique", done: Boolean(store.phoneE164 || store.contactPhone), href: "/dashboard/boutique#informations" },
    { key: "theme", label: "Thème", done: Boolean(store.theme), href: "/dashboard/boutique#apparence" },
    { key: "email", label: "Compte confirmé (numéro WhatsApp ou adresse e-mail)", done: accountVerified, href: "/dashboard/profil" },
    { key: "subscription", label: "Essai ou abonnement en cours", done: Boolean(subscription) && !isStoreSubscriptionPaused(subscription), href: "/dashboard/abonnement" },
    { key: "product", label: "Au moins un produit actif", done: activeProducts > 0, href: "/dashboard/produits/nouveau" },
    { key: "delivery", label: "Une zone de livraison avec ses frais, ou le retrait en boutique", done: activeZones > 0 || store.pickupEnabled, href: "/dashboard/livraisons" },
  ];
  // Lancement gratuit (ADR-014) : l'abonnement n'est pas une condition de publication.
  return billingEnabled ? items : items.filter((item) => item.key !== "subscription");
}

/** Publie la boutique si toutes les conditions sont remplies (dont une zone à frais fixes ou le retrait). */
export async function publishStoreIfReady(storeId: string, accountVerified: boolean) {
  const suspended = await prisma.store.findUnique({ where: { id: storeId }, select: { suspendedAt: true } });
  if (suspended?.suspendedAt) {
    return { ok: false as const, missing: [{ key: "suspended", label: "Boutique suspendue par l’administration PrestAfrik", done: false, href: "/dashboard/boutique" }] };
  }
  const checklist = await getPublicationChecklist(storeId, accountVerified);
  const missing = checklist.filter((item) => !item.done);
  if (missing.length) return { ok: false as const, missing };
  const before = await prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { publishedAt: true } });
  await prisma.store.update({ where: { id: storeId }, data: { isPublished: true, publishedAt: new Date(), onboardingStep: null } });
  // E13 : une seule fois par boutique (première publication).
  if (!before.publishedAt) notifyStorePublished(storeId);
  return { ok: true as const };
}
