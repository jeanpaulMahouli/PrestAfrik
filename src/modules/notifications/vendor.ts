import "server-only";

import type { VendorNotificationKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Centre de notifications du vendeur (cloche du tableau de bord).
// Règles de gestion :
//   - commandes, réponses de l'équipe et alertes : toujours envoyées (le vendeur ne peut pas les couper) ;
//   - nouveautés et astuces : selon ses préférences (Notifications → Préférences) ;
//   - une même notification (même titre, même page) n'est pas répétée à moins de 10 minutes d'intervalle ;
//   - les notifications de plus de 90 jours sont supprimées automatiquement (planificateur).
// Toutes les fonctions d'envoi sont silencieuses : une notification qui échoue ne bloque jamais l'action d'origine.

export type VendorNotificationInput = { kind: VendorNotificationKind; title: string; body: string; url?: string | null; imageUrl?: string | null };

export const vendorNotificationKindLabels: Record<VendorNotificationKind, string> = {
  ORDER: "Commandes",
  MESSAGE: "Messages",
  NEWS: "Nouveautés",
  TIP: "Astuces",
  ALERT: "Alertes",
};

/** Types que le vendeur peut couper dans ses préférences. */
const optionalKinds: Partial<Record<VendorNotificationKind, "notifyNews" | "notifyTips">> = { NEWS: "notifyNews", TIP: "notifyTips" };
const retentionDays = 90;
const duplicateWindowMs = 10 * 60_000;

/** Page ouverte au clic : uniquement un chemin de PrestAfrik. */
const safeUrl = (url: string | null | undefined) => (url && /^\/(?!\/)[\w\-./?=&%#]*$/.test(url.trim()) ? url.trim() : null);

/** Crée une notification pour chaque personne (préférences respectées). Renvoie le nombre de notifications créées. */
export async function notifyUsers(userIds: string[], input: VendorNotificationInput) {
  try {
    let ids = [...new Set(userIds)];
    if (!ids.length) return 0;
    const preference = optionalKinds[input.kind];
    if (preference) {
      const allowed = await prisma.user.findMany({ where: { id: { in: ids }, [preference]: true }, select: { id: true } });
      ids = allowed.map((user) => user.id);
    }
    const url = safeUrl(input.url);
    // Anti-doublon : même titre et même page déjà reçus il y a moins de 10 minutes.
    const recent = await prisma.vendorNotification.findMany({
      where: { userId: { in: ids }, title: input.title.slice(0, 120), url, createdAt: { gte: new Date(Date.now() - duplicateWindowMs) } },
      select: { userId: true },
    });
    const skip = new Set(recent.map((row) => row.userId));
    const data = ids
      .filter((id) => !skip.has(id))
      .map((userId) => ({ userId, kind: input.kind, title: input.title.slice(0, 120), body: input.body.slice(0, 400), url, imageUrl: input.imageUrl ?? null }));
    if (!data.length) return 0;
    const created = await prisma.vendorNotification.createMany({ data });
    return created.count;
  } catch {
    return 0;
  }
}

/** Toute l'équipe d'une boutique (propriétaires, gestionnaires, préparateurs). */
export async function notifyStoreTeam(storeId: string, input: VendorNotificationInput) {
  const members = await prisma.storeMembership.findMany({ where: { storeId }, select: { userId: true } }).catch(() => []);
  return notifyUsers(
    members.map((member) => member.userId),
    input,
  );
}

/**
 * Lecture tolérante : la cloche ne fait jamais tomber le tableau de bord (base indisponible, ou client Prisma
 * pas encore régénéré après une migration : l'erreur est alors levée avant même la requête).
 */
export async function countUnreadNotifications(userId: string) {
  try {
    return await prisma.vendorNotification.count({ where: { userId, readAt: null } });
  } catch {
    return 0;
  }
}

export async function listNotifications(userId: string, { kind, take = 50 }: { kind?: VendorNotificationKind; take?: number } = {}) {
  try {
    return await prisma.vendorNotification.findMany({
      where: { userId, ...(kind ? { kind } : {}) },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, kind: true, title: true, body: true, url: true, imageUrl: true, readAt: true, createdAt: true },
    });
  } catch {
    return [];
  }
}

/** Marque une notification (ou toutes) comme lue. */
export async function markNotificationsRead(userId: string, id?: string) {
  try {
    await prisma.vendorNotification.updateMany({ where: { userId, readAt: null, ...(id ? { id } : {}) }, data: { readAt: new Date() } });
  } catch {
    // Silencieux : voir countUnreadNotifications.
  }
  return countUnreadNotifications(userId);
}

/** Nettoyage : notifications de plus de 90 jours. */
export async function purgeOldNotifications(now = new Date()) {
  try {
    return await prisma.vendorNotification.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - retentionDays * 86_400_000) } } });
  } catch {
    return { count: 0 };
  }
}
