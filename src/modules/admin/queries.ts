import "server-only";

import type { Prisma, StoreRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { classifyFailure, subscriptionDisplay, type FailureReason } from "@/modules/admin/display";
import { isStoreSubscriptionPaused } from "@/modules/subscriptions/dates";

export const adminPageSize = 25;
const day = 86_400_000;
/** Nombre maximal de tentatives d'un message automatique avant abandon. */
export const maxMessageAttempts = 3;

const subscriptionSelect = {
  status: true,
  billingPeriod: true,
  trialEndsAt: true,
  currentPeriodEnd: true,
  plan: { select: { name: true } },
} satisfies Prisma.SubscriptionSelect;

/* ---------- Boutiques ---------- */

function storeSearch(query: string): Prisma.StoreWhereInput {
  if (!query) return {};
  return {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { slug: { contains: query.toLowerCase() } },
      { memberships: { some: { role: "OWNER", user: { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] } } } },
    ],
  };
}

export async function getPlatformStats(now = new Date()) {
  const [stores, published, suspended, subscriptions, failedOrders, failedCampaigns] = await Promise.all([
    prisma.store.count(),
    prisma.store.count({ where: { isPublished: true, suspendedAt: null } }),
    prisma.store.count({ where: { suspendedAt: { not: null } } }),
    prisma.subscription.findMany({ select: subscriptionSelect }),
    prisma.outboxEvent.count({ where: { processedAt: null, lastError: { not: null }, createdAt: { gte: new Date(now.getTime() - day) } } }),
    prisma.marketingCampaignRecipient.count({ where: { status: "FAILED", simulatedAt: { gte: new Date(now.getTime() - day) } } }),
  ]);
  const groups = subscriptions.map((subscription) => ({ ...subscriptionDisplay(subscription, now), plan: subscription.plan.name }));
  const active = groups.filter((group) => group.group === "active");
  const trials = groups.filter((group) => group.group === "trial");
  return {
    stores,
    published,
    suspended,
    activeSubscriptions: active.length,
    activePlans: [...new Set(active.map((group) => group.plan))],
    trials: trials.length,
    trialsEndingSoon: trials.filter((group) => group.dueAt && group.dueAt.getTime() - now.getTime() <= 7 * day).length,
    expired: groups.filter((group) => group.group === "expired").length,
    dueWithin7Days: groups.filter((group) => (group.group === "active" || group.group === "trial") && group.dueAt && group.dueAt.getTime() - now.getTime() <= 7 * day).length,
    failedMessages24h: failedOrders + failedCampaigns,
  };
}

export async function listAdminStores({ query = "", page = 1, take = adminPageSize }: { query?: string; page?: number; take?: number }) {
  const now = new Date();
  const where = storeSearch(query);
  const [total, stores] = await Promise.all([
    prisma.store.count({ where }),
    prisma.store.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        isPublished: true,
        suspendedAt: true,
        suspensionReason: true,
        createdAt: true,
        subscription: { select: subscriptionSelect },
        memberships: { where: { role: "OWNER" }, orderBy: { createdAt: "asc" }, take: 1, select: { user: { select: { name: true, email: true } } } },
      },
    }),
  ]);
  const orderCounts = stores.length
    ? await prisma.order.groupBy({
        by: ["storeId"],
        where: { storeId: { in: stores.map((store) => store.id) }, createdAt: { gte: new Date(now.getTime() - 30 * day) } },
        _count: { _all: true },
      })
    : [];
  const ordersByStore = new Map(orderCounts.map((row) => [row.storeId, row._count._all]));
  return {
    total,
    stores: stores.map((store) => ({
      ...store,
      owner: store.memberships[0]?.user ?? null,
      orders30d: ordersByStore.get(store.id) ?? 0,
      subscriptionState: subscriptionDisplay(store.subscription, now),
      paused: store.subscription ? isStoreSubscriptionPaused(store.subscription, now) : false,
    })),
  };
}

/* ---------- Abonnements ---------- */

export const subscriptionFilters = ["all", "active", "trial", "expired", "canceled"] as const;
export type SubscriptionFilter = (typeof subscriptionFilters)[number];

export async function listAdminSubscriptions(filter: SubscriptionFilter, query = "") {
  const now = new Date();
  const subscriptions = await prisma.subscription.findMany({
    where: { store: storeSearch(query) },
    select: {
      ...subscriptionSelect,
      storeId: true,
      store: { select: { name: true, slug: true, memberships: { where: { role: "OWNER" }, take: 1, select: { user: { select: { name: true, email: true } } } } } },
    },
    take: 1000,
  });
  return subscriptions
    .map((subscription) => ({
      ...subscription,
      owner: subscription.store.memberships[0]?.user ?? null,
      state: subscriptionDisplay(subscription, now),
    }))
    .filter((subscription) => filter === "all" || subscription.state.group === filter)
    .sort((a, b) => (a.state.dueAt?.getTime() ?? Infinity) - (b.state.dueAt?.getTime() ?? Infinity));
}

/* ---------- Messages échoués ---------- */

export type FailedMessage = {
  id: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  mode: string;
  reason: FailureReason;
  attempts: string;
  at: Date;
};

/**
 * Messages qui n'ont pas pu partir : confirmations de commande (boîte d'envoi) et campagnes.
 * Ni le contenu, ni le numéro, ni le texte brut de l'erreur ne sortent de cette fonction.
 */
export async function listFailedMessages(hours: number, reason?: FailureReason) {
  const since = new Date(Date.now() - hours * 3_600_000);
  const [orderEvents, campaignRecipients] = await Promise.all([
    prisma.outboxEvent.findMany({
      where: { processedAt: null, lastError: { not: null }, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { id: true, attempts: true, lastError: true, createdAt: true, store: { select: { id: true, name: true, slug: true, whatsappSettings: { select: { mode: true } } } } },
    }),
    prisma.marketingCampaignRecipient.findMany({
      where: { status: "FAILED", simulatedAt: { gte: since } },
      orderBy: { simulatedAt: "desc" },
      take: 500,
      select: { id: true, error: true, simulatedAt: true, campaign: { select: { store: { select: { id: true, name: true, slug: true } } } } },
    }),
  ]);
  const messages: FailedMessage[] = [
    ...orderEvents.map((event) => ({
      id: event.id,
      storeId: event.store.id,
      storeName: event.store.name,
      storeSlug: event.store.slug,
      mode: event.store.whatsappSettings?.mode === "CLOUD_API" ? "Mode API" : "Lien wa.me",
      reason: classifyFailure(event.lastError),
      attempts: `${Math.min(event.attempts, maxMessageAttempts)} sur ${maxMessageAttempts}`,
      at: event.createdAt,
    })),
    ...campaignRecipients.map((recipient) => ({
      id: recipient.id,
      storeId: recipient.campaign.store.id,
      storeName: recipient.campaign.store.name,
      storeSlug: recipient.campaign.store.slug,
      mode: "Campagne",
      reason: classifyFailure(recipient.error),
      attempts: "1 sur 1",
      at: recipient.simulatedAt,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const counts = { all: messages.length, token: 0, template: 0, number: 0, other: 0 } satisfies Record<FailureReason | "all", number>;
  for (const message of messages) counts[message.reason] += 1;
  return { counts, messages: reason ? messages.filter((message) => message.reason === reason) : messages };
}

/* ---------- Utilisateurs ---------- */

export async function listAdminUsers({ query = "", page = 1, take = adminPageSize }: { query?: string; page?: number; take?: number }) {
  const where: Prisma.UserWhereInput = query
    ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] }
    : {};
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      // Jamais de mot de passe ni de jeton : seuls le compte, ses rôles et ses dates sont lus.
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        platformRole: true,
        suspendedAt: true,
        createdAt: true,
        memberships: { orderBy: { createdAt: "asc" }, select: { role: true, store: { select: { name: true } } } },
      },
    }),
  ]);
  const lastSessions = users.length
    ? await prisma.session.groupBy({ by: ["userId"], where: { userId: { in: users.map((user) => user.id) } }, _max: { updatedAt: true } })
    : [];
  const lastSeen = new Map(lastSessions.map((row) => [row.userId, row._max.updatedAt]));
  return {
    total,
    users: users.map((user) => ({
      ...user,
      memberships: user.memberships as { role: StoreRole; store: { name: string } }[],
      lastSeenAt: lastSeen.get(user.id) ?? null,
    })),
  };
}

/* ---------- Journal ---------- */

export function listAuditLog(take = 50) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, action: true, targetType: true, targetId: true, details: true, createdAt: true, actor: { select: { name: true } } },
  });
}
