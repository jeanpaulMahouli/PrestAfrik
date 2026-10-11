"use server";

import {
  OrderProcessingStatus,
  type Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/modules/auth/permissions";
import { requireStorePermission } from "@/modules/stores/context";
import { orderStatusTransition } from "@/modules/orders/status";

const actionSchema = z.object({
  orderId: z.cuid(),
  intent: z.enum(["accept", "decline", "prepare", "complete", "cancel"]),
});

type TransactionClient = Prisma.TransactionClient;

class OrderManagementProblem extends Error {}

async function releaseReservations(
  transaction: TransactionClient,
  orderId: string,
  consumeStock: boolean,
) {
  const reservations = await transaction.stockReservation.findMany({
    where: { orderId, releasedAt: null },
    select: { id: true, productId: true, variantId: true, quantity: true },
  });

  for (const reservation of reservations) {
    const inventory = reservation.variantId
      ? await transaction.productVariant.updateMany({
          where: {
            id: reservation.variantId,
            productId: reservation.productId,
            reservedQuantity: { gte: reservation.quantity },
            ...(consumeStock ? { stockQuantity: { gte: reservation.quantity } } : {}),
          },
          data: {
            reservedQuantity: { decrement: reservation.quantity },
            ...(consumeStock ? { stockQuantity: { decrement: reservation.quantity } } : {}),
          },
        })
      : await transaction.product.updateMany({
          where: {
            id: reservation.productId,
            reservedQuantity: { gte: reservation.quantity },
            ...(consumeStock ? { stockQuantity: { gte: reservation.quantity } } : {}),
          },
          data: {
            reservedQuantity: { decrement: reservation.quantity },
            ...(consumeStock ? { stockQuantity: { decrement: reservation.quantity } } : {}),
          },
        });

    if (inventory.count !== 1) {
      throw new OrderManagementProblem("La réservation de stock ne correspond plus à l’inventaire.");
    }

    await transaction.stockReservation.update({
      where: { id: reservation.id },
      data: { releasedAt: new Date() },
    });
  }
}

export async function updateOrderStatus(formData: FormData) {
  const parsed = actionSchema.safeParse({
    orderId: formData.get("orderId"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) redirect("/dashboard/commandes?erreur=action-invalide");

  const { session, store, membership } = await requireStorePermission("orders.read");
  const { orderId, intent } = parsed.data;
  const needsManagePermission = intent === "accept" || intent === "decline" || intent === "cancel";
  if (
    (needsManagePermission && !hasPermission(membership.role, "orders.manage")) ||
    (!needsManagePermission && !hasPermission(membership.role, "orders.prepare"))
  ) {
    redirect(`/dashboard/commandes/${orderId}?erreur=non-autorise`);
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findFirst({
        where: { id: orderId, storeId: store.id },
        select: {
          id: true,
          confirmationStatus: true,
          processingStatus: true,
        },
      });
      if (!order) throw new OrderManagementProblem("Commande introuvable.");

      const next = orderStatusTransition(
        order.confirmationStatus,
        order.processingStatus,
        intent,
      );
      if (!next) throw new OrderManagementProblem("Cette commande ne peut plus changer d’état.");

      const updated = await transaction.order.updateMany({
        where: {
          id: order.id,
          storeId: store.id,
          confirmationStatus: order.confirmationStatus,
          processingStatus: order.processingStatus,
        },
        data: next,
      });
      if (updated.count !== 1) {
        throw new OrderManagementProblem("La commande a été modifiée. Recharge la page.");
      }

      if (next.processingStatus === OrderProcessingStatus.CANCELLED) {
        await releaseReservations(transaction, order.id, false);
      } else if (next.processingStatus === OrderProcessingStatus.COMPLETED) {
        await releaseReservations(transaction, order.id, true);
      }

      const statusValue = `${next.confirmationStatus}:${next.processingStatus}`;
      await transaction.orderEvent.create({
        data: {
          orderId: order.id,
          type: `SELLER_${intent.toUpperCase()}`,
          fromValue: `${order.confirmationStatus}:${order.processingStatus}`,
          toValue: statusValue,
          actorId: session.user.id,
        },
      });
    });
  } catch (error) {
    if (error instanceof OrderManagementProblem) {
      redirect(`/dashboard/commandes/${orderId}?erreur=operation-echouee`);
    }
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/commandes");
  revalidatePath(`/dashboard/commandes/${orderId}`);
  redirect(`/dashboard/commandes/${orderId}?succes=statut`);
}
