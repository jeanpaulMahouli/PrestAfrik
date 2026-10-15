import "server-only";

import { Prisma } from "@prisma/client";
import { billingEnabled, freePlan } from "@/config/billing";
import { prisma } from "@/lib/prisma";
import { daysSince, daysUntil, startOfUtcMonth } from "@/modules/subscriptions/dates";
export { isStoreSubscriptionPaused } from "@/modules/subscriptions/dates";

export type SubscriptionFeature = "products" | "campaigns";
export type SubscriptionAccess = Awaited<ReturnType<typeof getStoreSubscriptionAccess>>;

export class SubscriptionLimitError extends Error {
  constructor(
    public readonly code: "PRODUCT_QUOTA" | "MEMBER_QUOTA" | "MESSAGE_QUOTA" | "EXPIRED_FEATURE",
    message: string,
  ) {
    super(message);
  }
}

export async function getStoreSubscriptionAccess(storeId: string, now = new Date()) {
  let subscription = await prisma.subscription.findUnique({
    where: { storeId },
    include: { plan: true, scheduledPlan: true },
  });
  if (!subscription) {
    throw new Error(`Aucun abonnement n’est configuré pour la boutique ${storeId}.`);
  }
  if (subscription.scheduledAt && subscription.scheduledAt <= now && subscription.scheduledPlanId) {
    await prisma.subscription.updateMany({
      where: {
        id: subscription.id,
        scheduledAt: { lte: now },
        scheduledPlanId: subscription.scheduledPlanId,
      },
      data: {
        planId: subscription.scheduledPlanId,
        scheduledPlanId: null,
        scheduledAt: null,
        status: "EXPIRED",
      },
    });
    subscription = await prisma.subscription.findUnique({
      where: { storeId },
      include: { plan: true, scheduledPlan: true },
    });
    if (!subscription) throw new Error(`Aucun abonnement n’est configuré pour la boutique ${storeId}.`);
  }

  const currentPeriodEnd = subscription.currentPeriodEnd;
  const trial = subscription.status === "TRIAL" && subscription.trialEndsAt > now;
  const paid =
    (subscription.status === "ACTIVE" || subscription.status === "CANCELED") &&
    currentPeriodEnd !== null &&
    currentPeriodEnd > now;
  const expiresAt = paid
    ? currentPeriodEnd
    : subscription.currentPeriodEnd ?? subscription.trialEndsAt;
  const active = trial || paid;
  const expiredDays = active ? 0 : daysSince(expiresAt, now);
  const remainingDays = active ? daysUntil(expiresAt, now) : 0;
  const periodStart = startOfUtcMonth(now);
  const [orderMessages, campaignMessages] = await Promise.all([
    prisma.outboxEvent.count({
      where: {
        storeId,
        type: "ORDER_CONFIRMATION_REQUESTED",
        processedAt: { gte: periodStart },
        lastError: null,
      },
    }),
    prisma.marketingCampaignRecipient.count({
      where: {
        campaign: { storeId },
        simulatedAt: { gte: periodStart },
      },
    }),
  ]);
  const usedMessages = orderMessages + campaignMessages;

  const plan = freePlan(subscription.plan);
  if (!billingEnabled) {
    // Gratuité du lancement : jamais d'expiration, de restriction ni de rappel.
    return {
      subscription,
      plan,
      phase: "FREE" as const,
      expiresAt,
      active: true,
      remainingDays: 0,
      expiredDays: 0,
      featureRestricted: false,
      storefrontPaused: false,
      reminderDays: null,
      usedMessages,
      remainingMessages: Math.max(0, plan.monthlyMessageQuota - usedMessages),
    } as const;
  }
  return {
    subscription,
    plan,
    phase: active ? (trial ? ("TRIAL" as const) : ("ACTIVE" as const)) : ("EXPIRED" as const),
    expiresAt,
    active,
    remainingDays,
    expiredDays,
    featureRestricted: !active && expiredDays >= 7,
    storefrontPaused: !active && expiredDays >= 14,
    reminderDays: active && [1, 3, 7].includes(remainingDays) ? remainingDays : null,
    usedMessages,
    remainingMessages: Math.max(0, plan.monthlyMessageQuota - usedMessages),
  } as const;
}

export function isSubscriptionFeatureRestricted(
  access: Pick<SubscriptionAccess, "active" | "expiredDays">,
  feature: SubscriptionFeature,
) {
  return !access.active && access.expiredDays >= 7 && (feature === "products" || feature === "campaigns");
}

export async function getMonthlyMessageUsage(storeId: string, now = new Date()) {
  const periodStart = startOfUtcMonth(now);
  const [orderMessages, campaignMessages] = await Promise.all([
    prisma.outboxEvent.count({
      where: {
        storeId,
        type: "ORDER_CONFIRMATION_REQUESTED",
        processedAt: { gte: periodStart },
        lastError: null,
      },
    }),
    prisma.marketingCampaignRecipient.count({
      where: { campaign: { storeId }, simulatedAt: { gte: periodStart } },
    }),
  ]);
  return orderMessages + campaignMessages;
}

export async function getSubscriptionAccessForTransaction(
  transaction: Prisma.TransactionClient,
  storeId: string,
  now = new Date(),
) {
  let subscription = await transaction.subscription.findUnique({
    where: { storeId },
    include: { plan: true },
  });
  if (!subscription) {
    throw new Error(`Aucun abonnement n’est configuré pour la boutique ${storeId}.`);
  }
  if (subscription.scheduledAt && subscription.scheduledAt <= now && subscription.scheduledPlanId) {
    await transaction.subscription.updateMany({
      where: {
        id: subscription.id,
        scheduledAt: { lte: now },
        scheduledPlanId: subscription.scheduledPlanId,
      },
      data: {
        planId: subscription.scheduledPlanId,
        scheduledPlanId: null,
        scheduledAt: null,
        status: "EXPIRED",
      },
    });
    subscription = await transaction.subscription.findUnique({
      where: { storeId },
      include: { plan: true },
    });
    if (!subscription) throw new Error(`Aucun abonnement n’est configuré pour la boutique ${storeId}.`);
  }
  const active =
    (subscription.status === "TRIAL" && subscription.trialEndsAt > now) ||
    ((subscription.status === "ACTIVE" || subscription.status === "CANCELED") &&
      subscription.currentPeriodEnd !== null &&
      subscription.currentPeriodEnd > now);
  const expiresAt = subscription.currentPeriodEnd ?? subscription.trialEndsAt;
  const expiredDays = active ? 0 : daysSince(expiresAt, now);
  if (!billingEnabled) return { ...subscription, plan: freePlan(subscription.plan), active: true, expiredDays: 0, featureRestricted: false };
  return {
    ...subscription,
    active,
    expiredDays,
    featureRestricted: !active && expiredDays >= 7,
  };
}

export async function lockSubscriptionForUpdate(
  transaction: Prisma.TransactionClient,
  storeId: string,
) {
  const rows = await transaction.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Subscription" WHERE "storeId" = ${storeId} FOR UPDATE
  `;
  if (!rows.length) {
    throw new Error(`Aucun abonnement n’est configuré pour la boutique ${storeId}.`);
  }
}

export async function assertCanCreateProduct(
  transaction: Prisma.TransactionClient,
  storeId: string,
  now = new Date(),
) {
  await lockSubscriptionForUpdate(transaction, storeId);
  const access = await getSubscriptionAccessForTransaction(transaction, storeId, now);
  if (access.featureRestricted) {
    throw new SubscriptionLimitError(
      "EXPIRED_FEATURE",
      "La période d’essai est expirée depuis au moins 7 jours. Choisis une offre pour créer de nouveaux produits.",
    );
  }
  const activeProducts = await transaction.product.count({
    where: { storeId, status: { not: "ARCHIVED" } },
  });
  if (
    access.plan.productQuota !== null &&
    activeProducts >= access.plan.productQuota
  ) {
    throw new SubscriptionLimitError(
      "PRODUCT_QUOTA",
      `Le quota de ${access.plan.productQuota} produits actifs est atteint. Passe à une offre supérieure.`,
    );
  }
}

export async function assertCanInviteMember(
  transaction: Prisma.TransactionClient,
  storeId: string,
  alreadyInvited: boolean,
  now = new Date(),
) {
  await lockSubscriptionForUpdate(transaction, storeId);
  const access = await getSubscriptionAccessForTransaction(transaction, storeId, now);
  const [members, pendingInvitations] = await Promise.all([
    transaction.storeMembership.count({ where: { storeId } }),
    transaction.storeInvitation.count({
      where: { storeId, acceptedAt: null, expiresAt: { gt: now } },
    }),
  ]);
  const requestedSeats = members + pendingInvitations + (alreadyInvited ? 0 : 1);
  if (requestedSeats > access.plan.memberQuota) {
    throw new SubscriptionLimitError(
      "MEMBER_QUOTA",
      `Le quota de ${access.plan.memberQuota} membres est atteint. Choisis une offre supérieure.`,
    );
  }
}

export async function assertCanCreateCampaign(storeId: string, now = new Date()) {
  return prisma.$transaction(async (transaction) => {
    await lockSubscriptionForUpdate(transaction, storeId);
    const access = await getSubscriptionAccessForTransaction(transaction, storeId, now);
    if (access.featureRestricted) {
      throw new SubscriptionLimitError(
        "EXPIRED_FEATURE",
        "La période d’essai est expirée depuis au moins 7 jours. Choisis une offre pour créer des campagnes.",
      );
    }
    return access;
  });
}

export async function getMonthlyMessageUsageForTransaction(
  transaction: Prisma.TransactionClient,
  storeId: string,
  now = new Date(),
) {
  const periodStart = startOfUtcMonth(now);
  const [orderMessages, campaignMessages] = await Promise.all([
    transaction.outboxEvent.count({
      where: {
        storeId,
        type: "ORDER_CONFIRMATION_REQUESTED",
        processedAt: { gte: periodStart },
        lastError: null,
      },
    }),
    transaction.marketingCampaignRecipient.count({
      where: { campaign: { storeId }, simulatedAt: { gte: periodStart } },
    }),
  ]);
  return orderMessages + campaignMessages;
}
