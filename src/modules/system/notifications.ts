import "server-only";

import { createHash } from "node:crypto";
import type { Prisma, SystemNotificationSeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Notifications techniques de l'administration (cloche) : erreurs serveur, lenteurs, e-mails, envois
// d'images, tâches planifiées. Une même erreur (même type, même message) n'est enregistrée qu'une fois :
// son compteur augmente et elle redevient « non lue ».

export type SystemNotificationType = "server-error" | "slow-request" | "slow-query" | "email" | "upload" | "scheduled-task" | "system";

export const systemNotificationTypeLabels: Record<SystemNotificationType, string> = {
  "server-error": "Erreur serveur",
  "slow-request": "Page lente",
  "slow-query": "Requête lente",
  email: "E-mail non envoyé",
  upload: "Envoi d’image en échec",
  "scheduled-task": "Tâche planifiée en échec",
  system: "Alerte système",
};

/** Seuils de lenteur (millisecondes), réglables par variables d'environnement. */
export const slowRequestMs = Number(process.env.SLOW_REQUEST_MS) || 3000;
export const slowQueryMs = Number(process.env.SLOW_QUERY_MS) || 2000;

/** Retire des messages ce qui ressemble à une donnée personnelle ou à un identifiant variable. */
export function normalizeMessage(message: string) {
  return message
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "<e-mail>")
    .replace(/\+?\d[\d\s]{7,}\d/g, "<numéro>")
    .replace(/\b[a-z0-9]{24,}\b/gi, "<id>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export function notificationFingerprint(type: string, message: string) {
  return createHash("sha256").update(`${type}\n${normalizeMessage(message)}`).digest("hex");
}

// Évite de saturer la base si une même erreur se répète en rafale : au plus une écriture par seconde et par empreinte.
const lastWrite = new Map<string, number>();

/** Enregistre (ou regroupe) une notification. Ne lève jamais d'erreur : la cloche ne doit rien casser. */
export async function recordSystemNotification({
  type,
  severity,
  message,
  context,
}: {
  type: SystemNotificationType;
  severity: SystemNotificationSeverity;
  message: string;
  context?: Prisma.InputJsonValue;
}) {
  try {
    const text = normalizeMessage(message) || "Erreur sans message";
    const fingerprint = notificationFingerprint(type, text);
    const now = Date.now();
    if (now - (lastWrite.get(fingerprint) ?? 0) < 1000) return;
    lastWrite.set(fingerprint, now);
    if (lastWrite.size > 2000) lastWrite.clear();
    await prisma.systemNotification.upsert({
      where: { fingerprint },
      create: { fingerprint, type, severity, message: text, context },
      update: { occurrences: { increment: 1 }, lastSeenAt: new Date(now), readAt: null, severity, ...(context ? { context } : {}) },
    });
  } catch (error) {
    console.error("Notification technique non enregistrée.", error instanceof Error ? error.message : error);
  }
}

export function listSystemNotifications({ take = 10, unreadOnly = false }: { take?: number; unreadOnly?: boolean } = {}) {
  return prisma.systemNotification.findMany({
    where: unreadOnly ? { readAt: null } : {},
    orderBy: [{ lastSeenAt: "desc" }],
    take,
    select: { id: true, type: true, severity: true, message: true, occurrences: true, firstSeenAt: true, lastSeenAt: true, readAt: true, context: true },
  });
}

export function countUnreadSystemNotifications() {
  return prisma.systemNotification.count({ where: { readAt: null } });
}
