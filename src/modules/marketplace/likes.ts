import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/** Cookie anonyme du visiteur (aucune donnée personnelle) : un « j'aime » par visiteur et par produit. */
export const visitorCookie = "pa_visiteur";

export type LikeSummary = { count: number; liked: boolean };

/**
 * Nombre de « j'aime » d'un produit et choix du visiteur. Renvoie null si la table n'existe pas encore
 * (migration 20261109120000_marketplace_admin_and_likes non appliquée) : le bouton n'est alors pas affiché.
 */
export async function getLikeSummary(productId: string): Promise<LikeSummary | null> {
  try {
    const visitorId = (await cookies()).get(visitorCookie)?.value ?? null;
    const [count, mine] = await Promise.all([
      prisma.productLike.count({ where: { productId } }),
      visitorId ? prisma.productLike.findUnique({ where: { productId_visitorId: { productId, visitorId } }, select: { productId: true } }) : null,
    ]);
    return { count, liked: Boolean(mine) };
  } catch {
    return null;
  }
}
