import "server-only";

import { universeFromDb, type ShopUniverse } from "@/config/marketplace";
import { prisma } from "@/lib/prisma";
import { propertySaleActivity, vehicleActivities, type ListingMode } from "@/modules/catalog/listing";

/** Univers d'une boutique (Shopping, Immobilier ou Services), déduit de son activité principale. */
export async function storeUniverse(activityId: string | null | undefined): Promise<ShopUniverse> {
  if (!activityId) return "vente";
  const activity = await prisma.activity.findUnique({ where: { id: activityId }, select: { universe: true } });
  return universeFromDb(activity?.universe);
}

/**
 * Univers de la boutique et type d'annonce de ses produits : locations et réservations (Immobilier),
 * vente de biens (Shopping, activité « Vente immobilière »), sinon aucun (produits, plats, prestations).
 */
export async function storeCatalogProfile(activityId: string | null | undefined): Promise<{ universe: ShopUniverse; listingMode: ListingMode | null }> {
  if (!activityId) return { universe: "vente", listingMode: null };
  const activity = await prisma.activity.findUnique({ where: { id: activityId }, select: { slug: true, universe: true } });
  const universe = universeFromDb(activity?.universe);
  const vehicles = (vehicleActivities as readonly string[]).includes(activity?.slug ?? "");
  const listingMode = vehicles ? null : universe === "immobilier" ? "rent" : activity?.slug === propertySaleActivity ? "sale" : null;
  return { universe, listingMode };
}
