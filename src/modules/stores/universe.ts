import "server-only";

import { prisma } from "@/lib/prisma";
import { propertySaleActivity, vehicleActivities, type ListingMode } from "@/modules/catalog/listing";

/**
 * Type d'annonce des produits d'une boutique, d'après son activité : location ou réservation (activités
 * de location de biens), vente de biens (« Vente immobilière »), sinon aucun (produits ordinaires).
 * Toutes les boutiques restent des boutiques : ce n'est qu'un bloc de caractéristiques dans le formulaire.
 */
export async function storeCatalogProfile(activityId: string | null | undefined): Promise<{ listingMode: ListingMode | null }> {
  if (!activityId) return { listingMode: null };
  const activity = await prisma.activity.findUnique({ where: { id: activityId }, select: { slug: true, universe: true } });
  const vehicles = (vehicleActivities as readonly string[]).includes(activity?.slug ?? "");
  const listingMode = vehicles ? null : activity?.universe === "IMMOBILIER" ? "rent" : activity?.slug === propertySaleActivity ? "sale" : null;
  return { listingMode };
}
