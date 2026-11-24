import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { autoResolveTickets, isQuietHour, runInactivityReminders, runPendingOrderReminders, runWeeklyTips } from "@/modules/push/triggers";
import { purgeOldNotifications } from "@/modules/notifications/vendor";

/**
 * Rappels push « Vous nous manquez », pour une tâche planifiée externe (cron de l'hébergeur, toutes les heures) :
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://prestafrik.com/api/cron/notifications
 * Le serveur les envoie déjà seul toutes les heures (src/instrumentation.ts) ; ce point d'entrée sert de relais
 * si le serveur s'endort. Sans CRON_SECRET, l'adresse est fermée.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  // Mêmes tâches que le planificateur interne (heures calmes respectées pour les rappels et les astuces).
  const now = new Date();
  const reminders = isQuietHour(now) ? { recipients: 0, delivered: 0 } : await runInactivityReminders(now);
  const [tips, orderReminders, resolved, purged] = await Promise.all([runWeeklyTips(now), runPendingOrderReminders(now), autoResolveTickets(now), purgeOldNotifications(now)]);
  return NextResponse.json({ ok: true, ...reminders, tips, orderReminders, resolvedTickets: resolved.count, purgedNotifications: purged.count });
}
