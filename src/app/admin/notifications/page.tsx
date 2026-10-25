import { revalidatePath } from "next/cache";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Tone } from "@/config/statuses";
import { formatDateTime, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { listSystemNotifications, slowQueryMs, systemNotificationTypeLabels, type SystemNotificationType } from "@/modules/system/notifications";

export const metadata = { title: "Notifications techniques" };

const severityLabels = { INFO: "Info", WARNING: "Attention", CRITICAL: "Critique" } as const;
const severityTones: Record<keyof typeof severityLabels, Tone> = { INFO: "info", WARNING: "warning", CRITICAL: "danger" };

async function markAllRead() {
  "use server";
  await requirePlatformAdmin();
  await prisma.systemNotification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/admin", "layout");
}

export default async function AdminNotificationsPage() {
  await requirePlatformAdmin();
  const notifications = await listSystemNotifications({ take: 200 });
  const unread = notifications.filter((item) => !item.readAt).length;

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Notifications techniques</h1>
          <p className="v-page-subtitle">
            Erreurs serveur, requêtes de plus de {formatNumber(slowQueryMs)} ms, e-mails et envois d’images en échec. Une même erreur est regroupée et comptée.
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllRead} className="v-page-actions">
            <SubmitButton className="btn btn-secondary" pendingLabel="…">Tout marquer comme lu</SubmitButton>
          </form>
        )}
      </div>
      {notifications.length ? (
        <section className="v-card v-card-flush">
          <table className="v-table admin-table">
            <thead>
              <tr>
                <th scope="col">Gravité</th>
                <th scope="col">Type</th>
                <th scope="col">Message</th>
                <th scope="col">Occurrences</th>
                <th scope="col">Première fois</th>
                <th scope="col">Dernière fois</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((item) => (
                <tr className={item.readAt ? "" : "is-unread"} key={item.id}>
                  <td className="v-cell-badges" data-label="Gravité"><Badge tone={severityTones[item.severity]}>{severityLabels[item.severity]}</Badge></td>
                  <td data-label="Type">{systemNotificationTypeLabels[item.type as SystemNotificationType] ?? item.type}</td>
                  <td className="v-cell-primary notification-message" data-label="Message">
                    {item.message}
                    {item.context && typeof item.context === "object" && "route" in item.context && <span className="v-cell-sub">{String(item.context.route)}</span>}
                  </td>
                  <td data-label="Occurrences">{formatNumber(item.occurrences)}</td>
                  <td data-label="Première fois">{formatDateTime(item.firstSeenAt)}</td>
                  <td data-label="Dernière fois">{formatDateTime(item.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <div className="v-card v-empty">
          <h2>Aucune notification</h2>
          <p>Tout fonctionne normalement. Les erreurs et lenteurs apparaîtront ici dès qu’elles se produisent.</p>
        </div>
      )}
    </>
  );
}
