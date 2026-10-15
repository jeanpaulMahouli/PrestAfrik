import type { Prisma } from "@prisma/client";

/** Libère (annulation) ou consomme (commande terminée) le stock réservé d'une commande. */
export async function releaseOrderReservations(
  transaction: Prisma.TransactionClient,
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
      throw new Error("La réservation de stock ne correspond plus à l’inventaire.");
    }

    await transaction.stockReservation.update({
      where: { id: reservation.id },
      data: { releasedAt: new Date() },
    });
  }
}
