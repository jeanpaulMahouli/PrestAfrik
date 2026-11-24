import { revalidatePath } from "next/cache";
import Link from "next/link";
import { searchValue } from "@/components/admin/admin-feedback";
import { SeverityIcon } from "@/components/admin/notification-bell";
import { MailOpen } from "@/components/ui/icons";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { listSystemNotifications, systemNotificationTypeLabels, type SystemNotificationType } from "@/modules/system/notifications";

export const metadata = { title: "Notifications techniques" };

const filters = { toutes: "Toutes", "non-lues": "Non lues", critiques: "Critiques", attention: "Attention" } as const;
type Filter = keyof typeof filters;

async function markAllRead() {
  "use server";
  await requirePlatformAdmin();
  await prisma.systemNotification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/admin", "layout");
}

async function markRead(formData: FormData) {
  "use server";
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  if (/^[A-Za-z0-9_-]{10,64}$/.test(id)) await prisma.systemNotification.updateMany({ where: { id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/admin", "layout");
}

/** Erreurs serveur, lenteurs, e-mails et images en échec : regroupées par erreur identique, filtrables. */
export default async function AdminNotificationsPage({ searchParams }: PageProps<"/admin/notifications">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const filter: Filter = Object.hasOwn(filters, searchValue(params, "filtre")) ? (searchValue(params, "filtre") as Filter) : "toutes";
  const all = await listSystemNotifications({ take: 200 });
  const notifications = all.filter((item) =>
    filter === "non-lues" ? !item.readAt : filter === "critiques" ? item.severity === "CRITICAL" : filter === "attention" ? item.severity === "WARNING" : true,
  );
  const unread = all.filter((item) => !item.readAt).length;
  const countFor = (key: Filter) =>
    key === "non-lues" ? unread : key === "critiques" ? all.filter((item) => item.severity === "CRITICAL").length : key === "attention" ? all.filter((item) => item.severity === "WARNING").length : all.length;

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Notifications techniques</h1>
        </div>
        {unread > 0 && (
          <form action={markAllRead} className="v-page-actions">
            <SubmitButton className="btn btn-secondary" pendingLabel="…">
              <MailOpen aria-hidden="true" size={16} /> Tout marquer lu
            </SubmitButton>
          </form>
        )}
      </div>
      <nav aria-label="Filtrer" className="pill-tabs">
        {(Object.keys(filters) as Filter[]).map((key) => (
          <Link aria-current={filter === key ? "page" : undefined} href={key === "toutes" ? "/admin/notifications" : `/admin/notifications?filtre=${key}`} key={key}>
            {filters[key]} ({countFor(key)})
          </Link>
        ))}
      </nav>
      {notifications.length ? (
        <section className="v-card v-card-flush">
          <table className="v-table admin-table">
            <thead>
              <tr>
                <th scope="col">Gravité</th>
                <th scope="col">Type</th>
                <th scope="col">Message</th>
                <th scope="col">Fois</th>
                <th scope="col">Dernière fois</th>
                <th scope="col">
                  <span className="visually-hidden">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((item) => (
                <tr className={item.readAt ? "" : "is-unread"} key={item.id}>
                  <td data-label="Gravité">
                    <SeverityIcon severity={item.severity} />
                  </td>
                  <td data-label="Type">{systemNotificationTypeLabels[item.type as SystemNotificationType] ?? item.type}</td>
                  <td className="v-cell-primary notification-message" data-label="Message">
                    {item.message}
                    {item.context && typeof item.context === "object" && "route" in item.context && <span className="v-cell-sub">{String(item.context.route)}</span>}
                  </td>
                  <td data-label="Fois">{formatNumber(item.occurrences)}</td>
                  <td data-label="Dernière fois">
                    {formatDateTime(item.lastSeenAt)}
                    <span className="v-cell-sub">depuis le {formatDateTime(item.firstSeenAt)}</span>
                  </td>
                  <td className="admin-row-actions">
                    {!item.readAt && (
                      <form action={markRead}>
                        <input name="id" type="hidden" value={item.id} />
                        <SubmitButton aria-label="Marquer comme lu" className="icon-button icon-button-sm" pendingLabel="" title="Marquer comme lu">
                          <MailOpen aria-hidden="true" size={14} />
                        </SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <div className="v-card v-empty">
          <h2>Rien à signaler</h2>
          <p>{filter === "toutes" ? "Tout fonctionne normalement." : "Aucune notification pour ce filtre."}</p>
        </div>
      )}
    </>
  );
}
