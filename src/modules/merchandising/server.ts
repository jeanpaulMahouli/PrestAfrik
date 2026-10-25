import "server-only";

import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/modules/auth/permissions";
import type { StoreLinkInput } from "@/modules/merchandising/links";
import { getStoreContext } from "@/modules/stores/context";

/** Contexte vendeur autorisé (bannière : « store.manage », popups : « marketing.manage »), sinon null. */
export async function merchandisingContext(permission: Permission = "store.manage") {
  const context = await getStoreContext();
  return hasPermission(context.membership.role, permission) ? context : null;
}

/** La catégorie ou le produit choisi comme lien doit appartenir à la boutique (et ne pas être archivé). */
export async function linkBelongsToStore(storeId: string, link: StoreLinkInput) {
  if (link.categoryId) return Boolean(await prisma.productCategory.findFirst({ where: { id: link.categoryId, storeId }, select: { id: true } }));
  if (link.productId) return Boolean(await prisma.product.findFirst({ where: { id: link.productId, storeId, status: { not: "ARCHIVED" } }, select: { id: true } }));
  return true;
}

/** Catégories et produits proposés dans le sélecteur « Lien au clic ». */
export async function linkTargets(storeId: string) {
  const [categories, products] = await Promise.all([
    prisma.productCategory.findMany({ where: { storeId }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { storeId, status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true }, take: 500 }),
  ]);
  return { categories, products };
}

export type LinkTargets = Awaited<ReturnType<typeof linkTargets>>;
