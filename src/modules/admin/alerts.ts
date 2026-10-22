import "server-only";

import { billingEnabled, freePlan } from "@/config/billing";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { classifyFailure, failureReasonLabels } from "@/modules/admin/display";
import { daysUntil, startOfUtcMonth } from "@/modules/subscriptions/dates";

export type AlertLevel = "urgent" | "important" | "info";
export type AdminAlert = {
  /** Clé stable : une même situation, le même jour, garde la même clé (ignorée ou traitée une seule fois). */
  key: string;
  level: AlertLevel;
  title: string;
  body: string;
  action: { label: string; href: string };
};

export const alertLevelLabels: Record<AlertLevel, string> = { urgent: "Urgent", important: "Important", info: "Information" };
const levelOrder: Record<AlertLevel, number> = { urgent: 0, important: 1, info: 2 };
const day = 86_400_000;
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/** Seuil de messages échoués en 24 h qui déclenche une alerte pour une boutique. */
const failedMessagesThreshold = 3;
/** Commandes nouvelles restées sans réponse depuis plus de 3 jours. */
const staleOrdersThreshold = 3;

/** Calcule les situations qui demandent l'attention de l'équipe, à partir des données réelles. */
export async function computeAlerts(now = new Date()): Promise<AdminAlert[]> {
  const alerts: AdminAlert[] = [];
  const today = dayKey(now);

  const [apiFailures, failedEvents, staleOrders] = await Promise.all([
    prisma.whatsappSettings.findMany({
      where: { mode: "CLOUD_API", apiStatus: "FAILED" },
      select: { storeId: true, apiLastCheckedAt: true, store: { select: { name: true, slug: true } } },
    }),
    prisma.outboxEvent.findMany({
      where: { processedAt: null, lastError: { not: null }, createdAt: { gte: new Date(now.getTime() - day) } },
      select: { storeId: true, lastError: true, store: { select: { name: true, slug: true } } },
      take: 2000,
    }),
    prisma.order.groupBy({
      by: ["storeId"],
      where: { processingStatus: "TO_REVIEW", createdAt: { lt: new Date(now.getTime() - 3 * day) } },
      _count: { _all: true },
    }),
  ]);

  for (const settings of apiFailures) {
    alerts.push({
      key: `wa-api:${settings.storeId}:${settings.apiLastCheckedAt ? dayKey(settings.apiLastCheckedAt) : today}`,
      level: "urgent",
      title: "Connexion WhatsApp API en échec",
      body: `${settings.store.name} : Meta refuse la connexion${settings.apiLastCheckedAt ? ` depuis le ${formatDate(settings.apiLastCheckedAt)}` : ""}. Les confirmations automatiques ne partent plus.`,
      action: { label: "Vérifier la boutique", href: `/admin?q=${encodeURIComponent(settings.store.slug)}` },
    });
  }

  const failedByStore = new Map<string, { name: string; slug: string; reasons: string[] }>();
  for (const event of failedEvents) {
    const entry = failedByStore.get(event.storeId) ?? { name: event.store.name, slug: event.store.slug, reasons: [] };
    entry.reasons.push(failureReasonLabels[classifyFailure(event.lastError)]);
    failedByStore.set(event.storeId, entry);
  }
  for (const [storeId, entry] of failedByStore) {
    if (entry.reasons.length < failedMessagesThreshold) continue;
    const frequent = [...new Set(entry.reasons)].sort((a, b) => entry.reasons.filter((r) => r === b).length - entry.reasons.filter((r) => r === a).length)[0];
    alerts.push({
      key: `failed:${storeId}:${today}`,
      level: "important",
      title: `${entry.reasons.length} messages échoués en 24 h`,
      body: `${entry.name} : raison la plus fréquente, « ${frequent.toLocaleLowerCase("fr-FR")} ».`,
      action: { label: "Aider le vendeur", href: `/admin/messages?q=${encodeURIComponent(entry.slug)}` },
    });
  }

  if (staleOrders.length) {
    const stores = await prisma.store.findMany({ where: { id: { in: staleOrders.map((row) => row.storeId) } }, select: { id: true, name: true, slug: true } });
    const byId = new Map(stores.map((store) => [store.id, store]));
    for (const row of staleOrders) {
      const store = byId.get(row.storeId);
      if (!store || row._count._all < staleOrdersThreshold) continue;
      alerts.push({
        key: `stale-orders:${store.id}:${today}`,
        level: "info",
        title: `${row._count._all} commandes sans réponse depuis plus de 3 jours`,
        body: `${store.name} n’a ni validé ni annulé ces commandes. Le vendeur a peut-être besoin d’aide pour prendre en main son espace.`,
        action: { label: "Voir la boutique", href: `/admin?q=${encodeURIComponent(store.slug)}` },
      });
    }
  }

  // Échéances et quotas : seulement quand les abonnements payants sont actifs (ADR-014).
  if (billingEnabled) {
    const subscriptions = await prisma.subscription.findMany({
      where: { OR: [{ status: "TRIAL", trialEndsAt: { gt: now, lte: new Date(now.getTime() + 2 * day) } }, { status: { in: ["TRIAL", "ACTIVE"] } }] },
      select: { storeId: true, status: true, trialEndsAt: true, plan: true, store: { select: { name: true, slug: true } } },
    });
    const monthStart = startOfUtcMonth(now);
    const [orderUsage, campaignUsage] = await Promise.all([
      prisma.outboxEvent.groupBy({ by: ["storeId"], where: { type: "ORDER_CONFIRMATION_REQUESTED", processedAt: { gte: monthStart }, lastError: null }, _count: { _all: true } }),
      prisma.marketingCampaign.findMany({ where: { recipients: { some: { simulatedAt: { gte: monthStart } } } }, select: { storeId: true, _count: { select: { recipients: { where: { simulatedAt: { gte: monthStart } } } } } } }),
    ]);
    const usage = new Map<string, number>();
    for (const row of orderUsage) usage.set(row.storeId, (usage.get(row.storeId) ?? 0) + row._count._all);
    for (const row of campaignUsage) usage.set(row.storeId, (usage.get(row.storeId) ?? 0) + row._count.recipients);

    for (const subscription of subscriptions) {
      const remaining = daysUntil(subscription.trialEndsAt, now);
      if (subscription.status === "TRIAL" && remaining >= 0 && remaining <= 1) {
        alerts.push({
          key: `trial-end:${subscription.storeId}:${dayKey(subscription.trialEndsAt)}`,
          level: "important",
          title: remaining === 0 ? "Essai qui se termine aujourd’hui" : "Essai qui se termine demain",
          body: `${subscription.store.name} : aucune offre choisie pour le moment.`,
          action: { label: "Voir l’abonnement", href: `/admin/abonnements?q=${encodeURIComponent(subscription.store.slug)}` },
        });
      }
      const quota = freePlan(subscription.plan).monthlyMessageQuota;
      const used = usage.get(subscription.storeId) ?? 0;
      if (quota > 0 && used / quota >= 0.9) {
        alerts.push({
          key: `quota:${subscription.storeId}:${dayKey(monthStart)}`,
          level: "info",
          title: `Quota de messages à ${Math.min(100, Math.floor((used / quota) * 100))} %`,
          body: `${subscription.store.name} a utilisé ${formatNumber(used)} messages sur ${formatNumber(quota)} ce mois-ci.`,
          action: { label: "Voir l’abonnement", href: `/admin/abonnements?q=${encodeURIComponent(subscription.store.slug)}` },
        });
      }
    }
  }

  return alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
}

/** Alertes ouvertes : celles qui n'ont été ni traitées ni ignorées. */
export async function listOpenAlerts(now = new Date()) {
  const alerts = await computeAlerts(now);
  if (!alerts.length) return [];
  const decided = await prisma.adminAlertState.findMany({ where: { key: { in: alerts.map((alert) => alert.key) } }, select: { key: true } });
  const closed = new Set(decided.map((state) => state.key));
  return alerts.filter((alert) => !closed.has(alert.key));
}
