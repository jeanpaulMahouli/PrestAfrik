import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Une adresse est prise si une autre boutique l'utilise, ou si elle est gardée en redirection pour une autre
 * boutique (ancienne adresse après un changement de nom) : la donner à quelqu'un d'autre casserait ses liens.
 */
export async function isSlugTaken(slug: string, exceptStoreId?: string) {
  const [owner, alias] = await Promise.all([
    prisma.store.findUnique({ where: { slug }, select: { id: true } }),
    prisma.storeSlugAlias.findUnique({ where: { slug }, select: { storeId: true } }),
  ]);
  return Boolean((owner && owner.id !== exceptStoreId) || (alias && alias.storeId !== exceptStoreId));
}

/** Adresses prises parmi une liste (vérification en direct de l'assistant). */
export async function takenSlugs(slugs: string[], exceptStoreId?: string | null) {
  const [stores, aliases] = await Promise.all([
    prisma.store.findMany({ where: { slug: { in: slugs }, ...(exceptStoreId ? { id: { not: exceptStoreId } } : {}) }, select: { slug: true } }),
    prisma.storeSlugAlias.findMany({ where: { slug: { in: slugs }, ...(exceptStoreId ? { storeId: { not: exceptStoreId } } : {}) }, select: { slug: true } }),
  ]);
  return new Set([...stores, ...aliases].map((row) => row.slug));
}
