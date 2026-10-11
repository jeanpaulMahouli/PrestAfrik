import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildOrderConfirmationMessage } from "@/modules/messaging/message-content";
import {
  getSubscriptionAccessForTransaction,
  getMonthlyMessageUsageForTransaction,
  lockSubscriptionForUpdate,
  SubscriptionLimitError,
} from "@/modules/subscriptions/service";

const batchSize = 20;

export function getSimulatedMessage(payload: Prisma.JsonValue): string | null {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return null;
  const simulator = payload.simulator;
  if (simulator === null || typeof simulator !== "object" || Array.isArray(simulator)) return null;
  const message = simulator.message;
  return typeof message === "string" ? message : null;
}

export async function processPendingOutboxEvents(
  storeId: string,
  storeName: string,
  limit = batchSize,
) {
  const batchLimit = Math.max(0, Math.min(batchSize, Math.trunc(limit)));
  if (batchLimit === 0) return { simulated: 0, skipped: 0 };
  return prisma.$transaction(async (transaction) => {
    await lockSubscriptionForUpdate(transaction, storeId);
    const now = new Date();
    const subscription = await getSubscriptionAccessForTransaction(transaction, storeId, now);
    const usedMessages = await getMonthlyMessageUsageForTransaction(transaction, storeId, now);
    const remainingQuota = subscription.plan.monthlyMessageQuota - usedMessages;
    if (remainingQuota <= 0) {
      throw new SubscriptionLimitError(
        "MESSAGE_QUOTA",
        "Le quota mensuel de messages est atteint. Choisis une offre supérieure.",
      );
    }
    const pendingEvents = await transaction.outboxEvent.findMany({
      where: {
        storeId,
        type: "ORDER_CONFIRMATION_REQUESTED",
        processedAt: null,
        availableAt: { lte: now },
      },
      orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
      take: Math.min(batchLimit, remainingQuota),
    });
    let simulated = 0;
    let skipped = 0;

    for (const event of pendingEvents) {
      const order = await transaction.order.findFirst({
        where: { id: event.aggregateId, storeId },
        select: {
          reference: true,
          customerName: true,
          trackingToken: true,
          totalXaf: true,
          followUpConsent: true,
        },
      });

      if (!order || !order.followUpConsent) {
        await transaction.outboxEvent.update({
          where: { id: event.id },
          data: {
            attempts: { increment: 1 },
            processedAt: now,
            lastError: order
              ? "Consentement au suivi absent : message ignoré."
              : "Commande introuvable : message ignoré.",
          },
        });
        skipped += 1;
        continue;
      }

      const trackingUrl = new URL(
        `/commande/suivi/${encodeURIComponent(order.trackingToken)}`,
        process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
      ).toString();
      const message = buildOrderConfirmationMessage({
        customerName: order.customerName,
        storeName,
        reference: order.reference,
        trackingUrl,
        totalXaf: order.totalXaf,
      });
      const payload = asJsonObject(event.payload);

      await transaction.outboxEvent.update({
        where: { id: event.id },
        data: {
          attempts: { increment: 1 },
          payload: {
            ...payload,
            simulator: {
              mode: "LOCAL_SIMULATION",
              message,
            },
          },
          processedAt: now,
          lastError: null,
        },
      });
      simulated += 1;
    }

    return { simulated, skipped };
  });
}

function asJsonObject(value: Prisma.JsonValue): Prisma.JsonObject {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}
