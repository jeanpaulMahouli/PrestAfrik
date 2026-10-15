import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stageProcessingStatuses } from "@/modules/orders/state-machine";

// Onglets de la liste des commandes : trois statuts seulement (ADR-013).
export const orderTabs = [
  { key: "toutes", label: "Toutes" },
  { key: "nouvelles", label: "Nouvelles" },
  { key: "validees", label: "Validées" },
  { key: "annulees", label: "Annulées" },
] as const;

export type OrderTab = (typeof orderTabs)[number]["key"];

export function orderTabFilter(tab: OrderTab): Prisma.OrderWhereInput {
  switch (tab) {
    case "nouvelles":
      return { processingStatus: { in: stageProcessingStatuses.NEW } };
    case "validees":
      return { processingStatus: "COMPLETED" };
    case "annulees":
      return { processingStatus: "CANCELLED" };
    default:
      return {};
  }
}

export function parseOrderTab(value: unknown): OrderTab {
  return orderTabs.some((tab) => tab.key === value) ? (value as OrderTab) : "toutes";
}

export const ordersPageSize = 25;

export async function listOrders(storeId: string, tab: OrderTab, page: number) {
  const where: Prisma.OrderWhereInput = { storeId, ...orderTabFilter(tab) };
  const [orders, total, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        reference: true,
        customerName: true,
        customerWhatsapp: true,
        deliveryCity: true,
        neighborhood: true,
        landmark: true,
        deliveryMethod: true,
        processingStatus: true,
        subtotalXaf: true,
        totalXaf: true,
        createdAt: true,
        items: { select: { productName: true, variantName: true, quantity: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ordersPageSize,
      take: ordersPageSize,
    }),
    prisma.order.count({ where }),
    Promise.all(
      orderTabs
        .filter((item) => item.key !== "toutes")
        .map(async (item) => [item.key, await prisma.order.count({ where: { storeId, ...orderTabFilter(item.key) } })] as const),
    ),
  ]);
  return { orders, total, counts: Object.fromEntries(counts) as Partial<Record<OrderTab, number>> };
}

/** Détail d'une commande, limité à la boutique (une commande d'autrui renvoie null, comme une absente). */
export async function getOrderDetail(storeId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    include: {
      items: {
        orderBy: { productName: "asc" },
        include: { product: { select: { images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } } },
      },
      events: { orderBy: { createdAt: "asc" }, take: 100 },
      payments: { orderBy: { createdAt: "asc" }, select: { type: true, amountXaf: true, receivedAt: true } },
      deliveryZone: { select: { name: true, estimatedDelay: true } },
    },
  });
  if (!order) return null;

  const actorIds = [...new Set(order.events.map((event) => event.actorId).filter((id): id is string => Boolean(id)))];
  const actors = actorIds.length ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
  return { ...order, actorNames: Object.fromEntries(actors.map((actor) => [actor.id, actor.name])) };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderDetail>>>;

const eventLabels: Record<string, string> = {
  CREATED: "Commande reçue",
  PROCESSING_COMPLETED: "Commande validée",
  PROCESSING_CANCELLED: "Commande annulée",
  PAYMENT_RECORDED: "Paiement enregistré",
  PAYMENT_REVERSED: "Paiement annulé",
};

export function orderEventLabel(type: string) {
  return eventLabels[type] ?? "Mise à jour de la commande";
}
