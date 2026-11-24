import "server-only";

import { formatFcfa, formatReference } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { isPushConfigured, sendTemplatedPush } from "@/modules/push/sender";
import { inactivityDays, inactivitySentence } from "@/modules/push/templates";
import { vendorTips } from "@/config/tips";
import { notifyStoreTeam, notifyUsers, purgeOldNotifications } from "@/modules/notifications/vendor";

// Déclencheurs des notifications : nouvelle commande, réponse de l'équipe, rappel d'absence, astuce de la semaine.
// Chaque événement crée une notification dans le centre du vendeur (cloche) et, s'il a activé les
// notifications push, une notification sur son téléphone. Toutes ces fonctions sont silencieuses : une
// notification qui ne part pas ne bloque jamais l'action d'origine.

const day = 86_400_000;
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** Nouvelle commande : à toute l'équipe de la boutique (propriétaires, gestionnaires, préparateurs). */
export async function pushNewOrder(storeId: string, orderReference: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { storeId_reference: { storeId, reference: orderReference } },
      select: { id: true, reference: true, customerName: true, totalXaf: true, subtotalXaf: true, store: { select: { name: true, memberships: { select: { user: { select: { id: true, name: true } } } } } } },
    });
    if (!order) return;
    // Confidentialité : prénom et initiale du nom du client seulement.
    const [first, last] = order.customerName.trim().split(/\s+/);
    const client = last ? `${first} ${last[0]}.` : first;
    const total = formatFcfa(order.totalXaf ?? order.subtotalXaf);
    await notifyStoreTeam(storeId, {
      kind: "ORDER",
      title: `Nouvelle commande ${formatReference(order.reference)}`,
      body: `${client} a commandé pour ${total}. Écrivez-lui sur WhatsApp pour confirmer.`,
      url: `/dashboard/commandes/${order.id}`,
    });
    if (!isPushConfigured()) return;
    await sendTemplatedPush(
      "NEW_ORDER",
      order.store.memberships.map(({ user }) => ({
        userId: user.id,
        vars: { prenom: firstName(user.name), boutique: order.store.name, reference: formatReference(order.reference), client, total: formatFcfa(order.totalXaf ?? order.subtotalXaf) },
      })),
      { url: `/dashboard/commandes/${order.id}`, tag: `commande-${order.id}` },
    );
  } catch {
    // Silencieux : voir l'en-tête du fichier.
  }
}

/** Réponse de l'équipe PrestAfrik à un message (ticket) envoyé par un vendeur connecté. */
export async function pushSupportReply(ticketId: string) {
  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { subject: true, requester: { select: { id: true, name: true } } } });
    if (!ticket?.requester) return;
    const url = `/dashboard/discussions/${ticketId}`;
    await notifyUsers([ticket.requester.id], { kind: "MESSAGE", title: "L’équipe PrestAfrik vous a répondu", body: `Réponse à « ${ticket.subject} ».`, url });
    if (!isPushConfigured()) return;
    await sendTemplatedPush("NEW_MESSAGE", [{ userId: ticket.requester.id, vars: { prenom: firstName(ticket.requester.name), sujet: ticket.subject } }], { tag: `message-${ticketId}`, url });
  } catch {
    // Silencieux.
  }
}

/**
 * Rappel « Vous nous manquez » : vendeurs abonnés aux notifications, sans activité depuis 2 jours, qui n'ont
 * pas encore reçu de rappel pour cette absence. Chaque vendeur est « réservé » avant l'envoi (mise à jour
 * conditionnelle) : deux serveurs qui tournent en même temps n'envoient jamais deux rappels.
 */
export async function runInactivityReminders(now = new Date()) {
  if (!isPushConfigured()) return { recipients: 0, delivered: 0 };
  const cutoff = new Date(now.getTime() - inactivityDays * day);
  const candidates = await prisma.user.findMany({
    where: {
      suspendedAt: null,
      pushSubscriptions: { some: {} },
      memberships: { some: {} },
      OR: [{ lastActiveAt: { lt: cutoff } }, { lastActiveAt: null, createdAt: { lt: cutoff } }],
    },
    select: {
      id: true,
      name: true,
      lastActiveAt: true,
      createdAt: true,
      lastInactivityPushAt: true,
      lastActiveStore: { select: { id: true, name: true } },
      memberships: { orderBy: { createdAt: "asc" }, take: 1, select: { store: { select: { id: true, name: true } } } },
    },
    take: 500,
  });

  const recipients: { userId: string; vars: Record<string, string> }[] = [];
  for (const user of candidates) {
    const lastSeen = user.lastActiveAt ?? user.createdAt;
    // Déjà relancé pour cette absence (rappel envoyé après la dernière visite).
    if (user.lastInactivityPushAt && user.lastInactivityPushAt >= lastSeen) continue;
    const claimed = await prisma.user.updateMany({
      where: { id: user.id, lastInactivityPushAt: user.lastInactivityPushAt },
      data: { lastInactivityPushAt: now },
    });
    if (!claimed.count) continue;
    const store = user.lastActiveStore ?? user.memberships[0]?.store;
    if (!store) continue;
    const newOrders = await prisma.order.count({ where: { storeId: store.id, createdAt: { gt: lastSeen } } });
    recipients.push({ userId: user.id, vars: { prenom: firstName(user.name), boutique: store.name, activite: inactivitySentence(newOrders) } });
  }
  return sendTemplatedPush("INACTIVITY", recipients, { tag: "rappel-absence" });
}

/** Heure à Douala (UTC+1, sans heure d'été). */
const doualaHour = (now: Date) => (now.getUTCHours() + 1) % 24;

/**
 * Heures calmes : aucune notification automatique entre 20 h et 9 h (heure de Douala). Les notifications
 * liées à une action (nouvelle commande, réponse de l'équipe) partent toujours.
 */
export const isQuietHour = (now = new Date()) => doualaHour(now) < 9 || doualaHour(now) >= 20;

/**
 * Astuce de la semaine (centre de notifications seulement, jamais en push) : au plus une tous les 7 jours,
 * pour les vendeurs inscrits depuis plus de 2 jours qui n'ont pas coupé les astuces, jamais la même deux fois.
 */
export async function runWeeklyTips(now = new Date()) {
  if (isQuietHour(now)) return 0;
  const cutoff = new Date(now.getTime() - 7 * day);
  const users = await prisma.user.findMany({
    where: {
      suspendedAt: null,
      notifyTips: true,
      memberships: { some: {} },
      createdAt: { lt: new Date(now.getTime() - 2 * day) },
      tipIndex: { lt: vendorTips.length },
      OR: [{ lastTipAt: null }, { lastTipAt: { lt: cutoff } }],
    },
    select: { id: true, tipIndex: true, lastTipAt: true },
    take: 500,
  });
  let sent = 0;
  for (const user of users) {
    // Réservation : deux serveurs en même temps n'envoient jamais deux astuces.
    const claimed = await prisma.user.updateMany({ where: { id: user.id, lastTipAt: user.lastTipAt, tipIndex: user.tipIndex }, data: { lastTipAt: now, tipIndex: { increment: 1 } } });
    if (!claimed.count) continue;
    const tip = vendorTips[user.tipIndex];
    sent += await notifyUsers([user.id], { kind: "TIP", title: tip.title, body: tip.body, url: tip.url });
  }
  return sent;
}

/**
 * Boîte de réception de l'administration : une conversation en attente du vendeur (l'équipe a répondu en
 * dernier) depuis 14 jours est classée « Traitée » automatiquement. Si le vendeur répond, elle se rouvre.
 */
export async function autoResolveTickets(now = new Date()) {
  return prisma.supportTicket
    .updateMany({ where: { status: "IN_PROGRESS", lastMessageAt: { lt: new Date(now.getTime() - 14 * day) } }, data: { status: "RESOLVED" } })
    .catch(() => ({ count: 0 }));
}

/**
 * Commandes en attente : chaque boutique dont des commandes attendent depuis plus de 24 h reçoit un rappel
 * dans le centre de notifications, au plus un par jour (même hors push).
 */
export async function runPendingOrderReminders(now = new Date()) {
  if (isQuietHour(now)) return 0;
  const waiting = await prisma.order.groupBy({
    by: ["storeId"],
    where: { processingStatus: "TO_REVIEW", createdAt: { lt: new Date(now.getTime() - day), gte: new Date(now.getTime() - 30 * day) } },
    _count: { _all: true },
  });
  let sent = 0;
  for (const row of waiting) {
    const members = await prisma.storeMembership.findMany({ where: { storeId: row.storeId }, select: { userId: true } });
    const ids = members.map((member) => member.userId);
    const already = await prisma.vendorNotification.count({ where: { userId: { in: ids }, kind: "ALERT", url: "/dashboard/commandes", createdAt: { gte: new Date(now.getTime() - day) } } });
    if (already) continue;
    const count = row._count._all;
    sent += await notifyUsers(ids, {
      kind: "ALERT",
      title: count > 1 ? `${count} commandes attendent votre réponse` : "Une commande attend votre réponse",
      body: "Vos clients attendent depuis plus de 24 h : écrivez-leur sur WhatsApp, puis validez ou annulez.",
      url: "/dashboard/commandes",
    });
  }
  return sent;
}

let schedulerStarted = false;

/**
 * Planificateur interne (serveur Node toujours allumé), toutes les heures : rappel d'absence (push, hors
 * heures calmes), astuce de la semaine, fermeture automatique des conversations, nettoyage des notifications.
 * Désactivable avec PUSH_SCHEDULER=off (par exemple si une tâche planifiée appelle /api/cron/notifications).
 */
export function startPushScheduler() {
  if (schedulerStarted || process.env.PUSH_SCHEDULER === "off") return;
  schedulerStarted = true;
  const run = () => {
    const now = new Date();
    if (!isQuietHour(now)) void runInactivityReminders(now).catch(() => undefined);
    void runWeeklyTips(now).catch(() => undefined);
    void runPendingOrderReminders(now).catch(() => undefined);
    void autoResolveTickets(now).catch(() => undefined);
    void purgeOldNotifications(now).catch(() => undefined);
  };
  setTimeout(run, 2 * 60_000).unref?.();
  setInterval(run, 60 * 60_000).unref?.();
}
