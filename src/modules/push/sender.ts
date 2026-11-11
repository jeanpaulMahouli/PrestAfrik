import "server-only";

import type { PushNotificationKind } from "@prisma/client";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { site } from "@/config/site";
import { defaultPushTemplates, renderPushText, safePushUrl, type PushTemplate } from "@/modules/push/templates";

// Envoi des notifications push (protocole Web Push, clés VAPID). Clés à créer une fois :
//   npx web-push generate-vapid-keys
// puis VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY dans l'environnement. Sans clés, rien n'est envoyé
// (et le bouton « Activer les notifications » n'est pas proposé aux vendeurs).

/** Clé publique transmise au navigateur pour l'abonnement (null si les notifications ne sont pas configurées). */
export function pushPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

export function isPushConfigured() {
  return Boolean(pushPublicKey() && process.env.VAPID_PRIVATE_KEY?.trim());
}

let configured = false;
function configure() {
  if (configured) return true;
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || `mailto:${site.email}`, pushPublicKey()!, process.env.VAPID_PRIVATE_KEY!.trim());
  configured = true;
  return true;
}

/** Texte en vigueur pour un type de notification : celui de l'administration, sinon celui du code. */
export async function getPushTemplate(kind: PushNotificationKind): Promise<PushTemplate> {
  const row = await prisma.pushNotificationTemplate.findUnique({ where: { kind } }).catch(() => null);
  return row ? { kind, enabled: row.enabled, title: row.title, body: row.body, url: row.url } : defaultPushTemplates[kind];
}

export type PushMessage = { title: string; body: string; url: string; tag?: string };

/** Après 5 échecs de suite (hors refus définitif), l'appareil est retiré. */
const maxFailures = 5;

/**
 * Envoie un message à tous les appareils des utilisateurs donnés. Les appareils refusés par le service push
 * (abonnement expiré ou retiré : 404 / 410) sont supprimés. Ne lève jamais d'erreur.
 */
export async function sendPushToUsers(userIds: string[], message: PushMessage) {
  const result = { recipients: 0, delivered: 0 };
  if (!userIds.length || !configure()) return result;
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: { in: [...new Set(userIds)] } } });
  result.recipients = new Set(subscriptions.map((subscription) => subscription.userId)).size;
  const payload = JSON.stringify({ title: message.title, body: message.body, url: safePushUrl(message.url), tag: message.tag });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, { TTL: 24 * 3600, urgency: "high" });
        result.delivered += 1;
        await prisma.pushSubscription.update({ where: { id: subscription.id }, data: { lastSuccessAt: new Date(), failureCount: 0 } }).catch(() => undefined);
      } catch (error) {
        const status = typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : 0;
        if (status === 404 || status === 410 || subscription.failureCount + 1 >= maxFailures) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
        } else {
          await prisma.pushSubscription.update({ where: { id: subscription.id }, data: { failureCount: { increment: 1 } } }).catch(() => undefined);
        }
      }
    }),
  );
  return result;
}

/**
 * Notification d'un type donné, personnalisée pour chaque destinataire (variables du texte).
 * Rien n'est envoyé si ce type est désactivé dans l'administration. Chaque envoi est inscrit à l'historique.
 */
export async function sendTemplatedPush(
  kind: PushNotificationKind,
  recipients: { userId: string; vars: Record<string, string | null | undefined> }[],
  options: { url?: string; tag?: string; template?: PushTemplate; sentById?: string } = {},
) {
  const total = { recipients: 0, delivered: 0 };
  if (!recipients.length || !isPushConfigured()) return total;
  const template = options.template ?? (await getPushTemplate(kind));
  if (!template.enabled) return total;

  for (const recipient of recipients) {
    const result = await sendPushToUsers([recipient.userId], {
      title: renderPushText(template.title, recipient.vars).slice(0, 120),
      body: renderPushText(template.body, recipient.vars).slice(0, 300),
      url: options.url ?? renderPushText(template.url, recipient.vars),
      tag: options.tag,
    });
    total.recipients += result.recipients;
    total.delivered += result.delivered;
  }
  if (total.recipients) {
    await prisma.pushNotificationLog
      .create({ data: { kind, title: template.title.slice(0, 80), body: template.body.slice(0, 240), recipients: total.recipients, delivered: total.delivered, sentById: options.sentById ?? null } })
      .catch(() => undefined);
  }
  return total;
}
