import "server-only";

import { formatFcfa, formatReference } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { isPushConfigured, sendTemplatedPush } from "@/modules/push/sender";
import { inactivityDays, inactivitySentence } from "@/modules/push/templates";

// Déclencheurs des notifications push : nouvelle commande, réponse de l'équipe, rappel d'absence.
// Toutes ces fonctions sont silencieuses : une notification qui ne part pas ne bloque jamais l'action d'origine.

const day = 86_400_000;
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** Nouvelle commande : à toute l'équipe de la boutique (propriétaires, gestionnaires, préparateurs). */
export async function pushNewOrder(storeId: string, orderReference: string) {
  if (!isPushConfigured()) return;
  try {
    const order = await prisma.order.findUnique({
      where: { storeId_reference: { storeId, reference: orderReference } },
      select: { id: true, reference: true, customerName: true, totalXaf: true, subtotalXaf: true, store: { select: { name: true, memberships: { select: { user: { select: { id: true, name: true } } } } } } },
    });
    if (!order) return;
    // Confidentialité : prénom et initiale du nom du client seulement.
    const [first, last] = order.customerName.trim().split(/\s+/);
    const client = last ? `${first} ${last[0]}.` : first;
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
  if (!isPushConfigured()) return;
  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { subject: true, requester: { select: { id: true, name: true } } } });
    if (!ticket?.requester) return;
    await sendTemplatedPush("NEW_MESSAGE", [{ userId: ticket.requester.id, vars: { prenom: firstName(ticket.requester.name), sujet: ticket.subject } }], { tag: `message-${ticketId}` });
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

let schedulerStarted = false;

/**
 * Planificateur interne (serveur Node toujours allumé) : vérifie les absences toutes les heures.
 * Désactivable avec PUSH_SCHEDULER=off (par exemple si une tâche planifiée appelle /api/cron/notifications).
 */
export function startPushScheduler() {
  if (schedulerStarted || process.env.PUSH_SCHEDULER === "off" || !isPushConfigured()) return;
  schedulerStarted = true;
  const run = () => void runInactivityReminders().catch(() => undefined);
  setTimeout(run, 2 * 60_000).unref?.();
  setInterval(run, 60 * 60_000).unref?.();
}
