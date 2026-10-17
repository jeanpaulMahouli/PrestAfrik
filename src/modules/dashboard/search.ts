import "server-only";

import type { Prisma, StoreRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/modules/auth/permissions";

/** Nombre maximal de résultats affichés par rubrique. */
export const searchLimit = 8;

export type SearchQuery = { text: string; digits: string; reference: string };

/** Prépare le texte saisi : « #MB-1041 » → référence « MB-1041 », « 6 99 12 34 56 » → chiffres « 699123456 ». */
export function parseSearchQuery(raw: unknown): SearchQuery | null {
  const text = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ").slice(0, 80) : "";
  if (text.length < 2) return null;
  const digits = text.replace(/\D/g, "");
  return { text, digits: digits.length >= 3 ? digits : "", reference: text.replace(/^#/, "") };
}

/** Recherche dans les commandes, clients et produits de la boutique, selon les droits du membre. */
export async function searchStore(storeId: string, role: StoreRole, query: SearchQuery) {
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });

  const orderWhere: Prisma.OrderWhereInput = {
    storeId,
    OR: [
      { reference: contains(query.reference) },
      { customerName: contains(query.text) },
      { neighborhood: contains(query.text) },
      { deliveryCity: contains(query.text) },
      ...(query.digits ? [{ customerWhatsapp: { contains: query.digits } }] : []),
    ],
  };
  const customerWhere: Prisma.CustomerWhereInput = {
    storeId,
    OR: [
      { name: contains(query.text) },
      { email: contains(query.text) },
      ...(query.digits ? [{ whatsapp: { contains: query.digits } }] : []),
    ],
  };
  const productWhere: Prisma.ProductWhereInput = {
    storeId,
    status: { not: "ARCHIVED" },
    OR: [{ name: contains(query.text) }, { sku: contains(query.text) }],
  };

  const [orders, customers, products] = await Promise.all([
    hasPermission(role, "orders.read")
      ? prisma.order.findMany({
          where: orderWhere,
          orderBy: { createdAt: "desc" },
          take: searchLimit,
          select: { id: true, reference: true, customerName: true, deliveryCity: true, neighborhood: true, totalXaf: true, subtotalXaf: true, processingStatus: true, createdAt: true },
        })
      : null,
    hasPermission(role, "customers.read")
      ? prisma.customer.findMany({
          where: customerWhere,
          orderBy: [{ lastOrderAt: { sort: "desc", nulls: "last" } }, { name: "asc" }],
          take: searchLimit,
          select: { id: true, name: true, whatsapp: true, orderCount: true },
        })
      : null,
    hasPermission(role, "products.read")
      ? prisma.product.findMany({
          where: productWhere,
          orderBy: { updatedAt: "desc" },
          take: searchLimit,
          select: {
            id: true,
            name: true,
            sku: true,
            priceXaf: true,
            status: true,
            images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
          },
        })
      : null,
  ]);

  return { orders, customers, products };
}
