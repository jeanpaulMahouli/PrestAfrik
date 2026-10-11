"use server";

import {
  PaymentMethod,
  PaymentType,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  courierBalanceContribution,
  getOrderPaymentSummary,
  type LedgerEntry,
} from "@/modules/payments/ledger";
import { requireStorePermission } from "@/modules/stores/context";

const paymentSchema = z.object({
  orderId: z.cuid(),
  type: z.nativeEnum(PaymentType).refine((type) => type !== PaymentType.REVERSAL),
  method: z.nativeEnum(PaymentMethod),
  amountXaf: z.coerce.number().int().positive().safe(),
  courierId: z.string().optional(),
  reference: z.string().trim().max(120),
  note: z.string().trim().max(500),
});

const reverseSchema = z.object({
  paymentId: z.cuid(),
  note: z.string().trim().max(500),
});

class PaymentProblem extends Error {}

const customerPaymentTypes = new Set<PaymentType>([
  PaymentType.PAYMENT_RECEIVED,
  PaymentType.PARTIAL_PAYMENT,
  PaymentType.COURIER_COLLECTION,
]);

export async function recordPayment(formData: FormData) {
  const parsed = paymentSchema.safeParse({
    orderId: formData.get("orderId"),
    type: formData.get("type"),
    method: formData.get("method"),
    amountXaf: formData.get("amountXaf"),
    courierId: formData.get("courierId") || undefined,
    reference: formData.get("reference") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) redirect("/dashboard/argent?erreur=paiement-invalide");
  if (
    (parsed.data.type === PaymentType.COURIER_COLLECTION ||
      parsed.data.type === PaymentType.SETTLEMENT) &&
    !parsed.data.courierId
  ) {
    redirect("/dashboard/argent?erreur=livreur-requis");
  }

  const { session, store } = await requireStorePermission("payments.manage");

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id"
        FROM "Order"
        WHERE "id" = ${parsed.data.orderId} AND "storeId" = ${store.id}
        FOR UPDATE
      `;
      const order = await transaction.order.findFirst({
        where: { id: parsed.data.orderId, storeId: store.id },
        select: {
          id: true,
          totalXaf: true,
          paymentStatus: true,
          payments: {
            select: {
              type: true,
              amountXaf: true,
              courierId: true,
              reverses: { select: { type: true, amountXaf: true } },
            },
          },
        },
      });
      if (!order) throw new PaymentProblem("Commande introuvable.");
      if (order.totalXaf === null) {
        throw new PaymentProblem("Le total doit être confirmé avant l’encaissement.");
      }

      if (parsed.data.courierId) {
        const courier = await transaction.courier.findFirst({
          where: {
            id: parsed.data.courierId,
            storeId: store.id,
            isActive: true,
          },
          select: { id: true },
        });
        if (!courier) throw new PaymentProblem("Livreur indisponible.");
      }

      const ledger = order.payments as (LedgerEntry & {
        courierId: string | null;
      })[];
      const summary = getOrderPaymentSummary(ledger, order.totalXaf);
      if (customerPaymentTypes.has(parsed.data.type)) {
        if (parsed.data.amountXaf > (summary.remainingXaf ?? 0)) {
          throw new PaymentProblem("Le montant dépasse le reste à encaisser.");
        }
      } else if (parsed.data.type === PaymentType.REFUND) {
        if (parsed.data.amountXaf > summary.paidXaf) {
          throw new PaymentProblem("Le remboursement dépasse le montant encaissé.");
        }
      } else if (parsed.data.type === PaymentType.SETTLEMENT) {
        const courierBalance = ledger
          .filter((entry) => entry.courierId === parsed.data.courierId)
          .reduce((sum, entry) => sum + courierBalanceContribution(entry), 0);
        if (parsed.data.amountXaf > courierBalance) {
          throw new PaymentProblem("Le reversement dépasse la collecte de ce livreur.");
        }
      }

      await transaction.payment.create({
        data: {
          storeId: store.id,
          orderId: order.id,
          authorId: session.user.id,
          type: parsed.data.type,
          method: parsed.data.method,
          amountXaf: parsed.data.amountXaf,
          courierId: parsed.data.courierId || null,
          reference: parsed.data.reference || null,
          note: parsed.data.note || null,
        },
      });

      const updatedStatus =
        customerPaymentTypes.has(parsed.data.type) || parsed.data.type === PaymentType.REFUND
          ? getOrderPaymentSummary(
              [
                ...ledger,
                {
                  type: parsed.data.type,
                  amountXaf: parsed.data.amountXaf,
                },
              ],
              order.totalXaf,
            ).status
          : summary.status;
      await transaction.order.update({
        where: { id: order.id },
        data: { paymentStatus: updatedStatus },
      });

      await transaction.orderEvent.create({
        data: {
          orderId: order.id,
          type: "PAYMENT_RECORDED",
          fromValue: order.paymentStatus,
          toValue: updatedStatus,
          note: `${parsed.data.type}:${parsed.data.amountXaf}`,
          actorId: session.user.id,
        },
      });
    });
  } catch (error) {
    if (error instanceof PaymentProblem) {
      redirect(`/dashboard/argent?erreur=${encodeURIComponent(error.message)}`);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      redirect("/dashboard/argent?erreur=livreur-invalide");
    }
    throw error;
  }

  revalidatePaymentViews(parsed.data.orderId);
  redirect("/dashboard/argent?succes=paiement");
}

export async function reversePayment(formData: FormData) {
  const parsed = reverseSchema.safeParse({
    paymentId: formData.get("paymentId"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) redirect("/dashboard/argent?erreur=ecriture-invalide");

  const { session, store } = await requireStorePermission("payments.manage");

  try {
    await prisma.$transaction(async (transaction) => {
      const original = await transaction.payment.findFirst({
        where: { id: parsed.data.paymentId, storeId: store.id },
        select: {
          id: true,
          orderId: true,
          type: true,
          method: true,
          amountXaf: true,
          courierId: true,
          reversedBy: { select: { id: true } },
          order: { select: { paymentStatus: true, totalXaf: true } },
        },
      });
      if (
        !original ||
        original.type === PaymentType.REVERSAL ||
        original.reversedBy
      ) {
        throw new PaymentProblem("Cette écriture ne peut pas être annulée.");
      }

      await transaction.$queryRaw`
        SELECT "id" FROM "Order"
        WHERE "id" = ${original.orderId} AND "storeId" = ${store.id}
        FOR UPDATE
      `;
      const duplicate = await transaction.payment.findUnique({
        where: { reversesId: original.id },
        select: { id: true },
      });
      if (duplicate) throw new PaymentProblem("Cette écriture a déjà été annulée.");

      await transaction.payment.create({
        data: {
          storeId: store.id,
          orderId: original.orderId,
          authorId: session.user.id,
          courierId: original.courierId,
          type: PaymentType.REVERSAL,
          method: original.method,
          amountXaf: original.amountXaf,
          reference: `ANNULATION-${original.id}`,
          note: parsed.data.note || `Annulation de l’écriture ${original.id}`,
          reversesId: original.id,
        },
      });

      const entries = await transaction.payment.findMany({
        where: { orderId: original.orderId, storeId: store.id },
        select: {
          type: true,
          amountXaf: true,
          reverses: { select: { type: true, amountXaf: true } },
        },
      });
      const summary = getOrderPaymentSummary(entries, original.order.totalXaf);
      await transaction.order.update({
        where: { id: original.orderId },
        data: { paymentStatus: summary.status },
      });
      await transaction.orderEvent.create({
        data: {
          orderId: original.orderId,
          type: "PAYMENT_REVERSED",
          fromValue: original.order.paymentStatus,
          toValue: summary.status,
          note: parsed.data.note || `Écriture ${original.id} annulée.`,
          actorId: session.user.id,
        },
      });
    });
  } catch (error) {
    if (error instanceof PaymentProblem) {
      redirect(`/dashboard/argent?erreur=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePaymentViews("");
  redirect("/dashboard/argent?succes=annulation");
}

function revalidatePaymentViews(orderId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/argent");
  revalidatePath("/dashboard/livraisons");
  revalidatePath("/dashboard/commandes");
  if (orderId) revalidatePath(`/dashboard/commandes/${orderId}`);
}
