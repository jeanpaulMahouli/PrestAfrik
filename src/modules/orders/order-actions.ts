"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { releaseOrderReservations } from "@/modules/orders/reservations";
import { canCancel, canValidate, orderStage } from "@/modules/orders/state-machine";
import { requireStorePermission } from "@/modules/stores/context";

class OrderProblem extends Error {}

const schema = z.object({
  orderId: z.cuid(),
  // Page de retour : la liste (avec son onglet) ou le détail de la commande.
  returnTo: z.string().regex(/^\/dashboard\/commandes(\/c[a-z0-9]+)?(\?[\w=&%-]*)?$/).catch("/dashboard/commandes"),
});

function parse(formData: FormData) {
  const parsed = schema.safeParse({ orderId: formData.get("orderId"), returnTo: formData.get("returnTo") ?? undefined });
  if (!parsed.success) redirect("/dashboard/commandes");
  return parsed.data;
}

function back(returnTo: string, params: Record<string, string>): never {
  const [path, query = ""] = returnTo.split("?");
  const search = new URLSearchParams(query);
  search.delete("succes");
  search.delete("erreur");
  for (const [key, value] of Object.entries(params)) search.set(key, value);
  redirect(`${path}?${search.toString()}`);
}

function refresh(orderId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/commandes");
  revalidatePath(`/dashboard/commandes/${orderId}`);
  revalidatePath("/dashboard/argent");
}

/**
 * « Marquer validée » : la commande est terminée et son montant est enregistré comme argent reçu.
 * Le stock réservé devient une sortie de stock définitive.
 */
export async function validateOrder(formData: FormData) {
  const { orderId, returnTo } = parse(formData);
  const { session, store } = await requireStorePermission("payments.manage");

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} AND "storeId" = ${store.id} FOR UPDATE`;
      const order = await transaction.order.findFirst({
        where: { id: orderId, storeId: store.id },
        select: { id: true, processingStatus: true, deliveryMethod: true, subtotalXaf: true, deliveryFeeXaf: true, totalXaf: true },
      });
      if (!order) throw new OrderProblem("Cette commande est introuvable.");
      if (!canValidate(orderStage(order.processingStatus))) throw new OrderProblem("Cette commande est déjà validée ou annulée.");
      // Anciennes commandes sans frais fixés : le montant retenu est celui des articles.
      const total = order.totalXaf ?? order.subtotalXaf + (order.deliveryFeeXaf ?? 0);

      await transaction.order.update({
        where: { id: order.id },
        data: {
          processingStatus: "COMPLETED",
          confirmationStatus: "CONFIRMED",
          paymentStatus: "PAID",
          deliveryStatus: order.deliveryMethod === "PICKUP" ? "PICKUP" : "DELIVERED",
          totalXaf: total,
        },
      });
      await releaseOrderReservations(transaction, order.id, true);
      if (total > 0) {
        await transaction.payment.create({
          data: { storeId: store.id, orderId: order.id, authorId: session.user.id, type: "PAYMENT_RECEIVED", method: "OTHER", amountXaf: total, note: "Commande validée" },
        });
      }
      await transaction.orderEvent.create({
        data: { orderId: order.id, type: "PROCESSING_COMPLETED", fromValue: order.processingStatus, toValue: "COMPLETED", actorId: session.user.id },
      });
    });
  } catch (error) {
    if (error instanceof OrderProblem) back(returnTo, { erreur: error.message });
    throw error;
  }

  refresh(orderId);
  invalidateStorefrontCache(store.id, store.slug);
  back(returnTo, { succes: "validee" });
}

/**
 * Annule une commande. Si elle était validée, l'argent compté est retiré (écriture inverse,
 * l'historique reste visible) et les articles reviennent en stock.
 */
export async function cancelOrder(formData: FormData) {
  const { orderId, returnTo } = parse(formData);
  const { session, store } = await requireStorePermission("orders.manage");

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} AND "storeId" = ${store.id} FOR UPDATE`;
      const order = await transaction.order.findFirst({
        where: { id: orderId, storeId: store.id },
        select: {
          id: true,
          processingStatus: true,
          payments: { where: { reversedBy: { is: null }, type: { in: ["PAYMENT_RECEIVED", "PARTIAL_PAYMENT", "COURIER_COLLECTION"] } }, select: { id: true, method: true, amountXaf: true } },
          reservations: { where: { releasedAt: { not: null } }, select: { productId: true, variantId: true, quantity: true } },
        },
      });
      if (!order) throw new OrderProblem("Cette commande est introuvable.");
      const stage = orderStage(order.processingStatus);
      if (!canCancel(stage)) throw new OrderProblem("Cette commande est déjà annulée.");

      if (stage === "VALIDATED") {
        for (const payment of order.payments) {
          await transaction.payment.create({
            data: { storeId: store.id, orderId: order.id, authorId: session.user.id, type: "REVERSAL", method: payment.method, amountXaf: payment.amountXaf, reversesId: payment.id, note: "Commande annulée" },
          });
        }
        // Remise en stock des articles sortis lors de la validation.
        for (const item of order.reservations) {
          if (item.variantId) await transaction.productVariant.updateMany({ where: { id: item.variantId, stockQuantity: { not: null } }, data: { stockQuantity: { increment: item.quantity } } });
          else await transaction.product.updateMany({ where: { id: item.productId, trackInventory: true }, data: { stockQuantity: { increment: item.quantity } } });
        }
      } else {
        await releaseOrderReservations(transaction, order.id, false);
      }

      await transaction.order.update({
        where: { id: order.id },
        data: { processingStatus: "CANCELLED", paymentStatus: stage === "VALIDATED" ? "REFUNDED" : "PENDING" },
      });
      await transaction.orderEvent.create({
        data: { orderId: order.id, type: "PROCESSING_CANCELLED", fromValue: order.processingStatus, toValue: "CANCELLED", actorId: session.user.id },
      });
    });
  } catch (error) {
    if (error instanceof OrderProblem) back(returnTo, { erreur: error.message });
    throw error;
  }

  refresh(orderId);
  invalidateStorefrontCache(store.id, store.slug);
  back(returnTo, { succes: "annulee" });
}
