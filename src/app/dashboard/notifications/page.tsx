import type { VendorNotificationKind } from "@prisma/client";
import Link from "next/link";
import { NotificationIcon, timeAgo } from "@/components/dashboard/vendor-bell";
import { VendorShell } from "@/components/layout/vendor-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import { markAllNotificationsRead, updateNotificationPreferences } from "@/modules/notifications/actions";
import { listNotifications, vendorNotificationKindLabels } from "@/modules/notifications/vendor";
import { getStoreContext } from "@/modules/stores/context";

export const metadata = { title: "Notifications" };

const filters: VendorNotificationKind[] = ["ORDER", "MESSAGE", "NEWS", "TIP", "ALERT"];

/** Centre de notifications : tout ce qui concerne la boutique, filtré par type, et les préférences. */
export default async function NotificationsPage({ searchParams }: PageProps<"/dashboard/notifications">) {
  const { session } = await getStoreContext();
  const params = await searchParams;
  const kind = filters.find((value) => value === params.type);
  const [items, user, counts] = await Promise.all([
    listNotifications(session.user.id, { kind, take: 100 }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { notifyNews: true, notifyTips: true } }),
    prisma.vendorNotification.groupBy({ by: ["kind"], where: { userId: session.user.id, readAt: null }, _count: { _all: true } }).catch(() => []),
  ]);
  const unread = (value: VendorNotificationKind) => counts.find((row) => row.kind === value)?._count._all ?? 0;
  const totalUnread = counts.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Notifications</h1>
        </div>
        <div className="v-page-actions v-page-actions-inline">
          <Link className="btn btn-secondary" href="/dashboard/discussions">
            Mes discussions
          </Link>
          {totalUnread > 0 && (
            <form action={markAllNotificationsRead}>
              <SubmitButton className="btn btn-secondary" pendingLabel="…">
                Tout marquer lu
              </SubmitButton>
            </form>
          )}
        </div>
      </div>
      {params.succes === "preferences" && (
        <p className="v-banner v-banner-success" role="status">
          Préférences enregistrées.
        </p>
      )}

      <nav aria-label="Type de notification" className="pill-tabs">
        <Link aria-current={!kind ? "page" : undefined} href="/dashboard/notifications">
          Toutes{totalUnread ? ` (${totalUnread})` : ""}
        </Link>
        {filters.map((value) => (
          <Link aria-current={kind === value ? "page" : undefined} href={`/dashboard/notifications?type=${value}`} key={value}>
            {vendorNotificationKindLabels[value]}
            {unread(value) ? ` (${unread(value)})` : ""}
          </Link>
        ))}
      </nav>

      <div className="vnotif-page">
        <section aria-label="Notifications" className="v-card v-card-flush">
          {items.length ? (
            <ul className="vnotif-list vnotif-list--page">
              {items.map((item) => (
                <li key={item.id}>
                  <a className={`vnotif-item${item.readAt ? "" : " is-unread"}`} href={`/dashboard/notifications/ouvrir/${item.id}`}>
                    <NotificationIcon kind={item.kind} />
                    <span className="vnotif-text">
                      <strong>{item.title}</strong>
                      <span>{item.body}</span>
                      <small>
                        {vendorNotificationKindLabels[item.kind]} · {timeAgo(item.createdAt)}
                      </small>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="v-empty">
              <h2>Rien pour le moment</h2>
              <p>Vos commandes, les réponses de l’équipe et les nouveautés arriveront ici.</p>
            </div>
          )}
        </section>

        <aside className="v-card vnotif-prefs" aria-labelledby="prefs-title">
          <h2 className="v-card-title" id="prefs-title">
            Préférences
          </h2>
          <form action={updateNotificationPreferences} className="v-stack">
            <label className="v-check">
              <input checked disabled type="checkbox" /> Commandes et messages <small className="v-muted">(toujours)</small>
            </label>
            <label className="v-check">
              <input defaultChecked={user?.notifyNews ?? true} name="notifyNews" type="checkbox" /> Nouveautés de PrestAfrik
            </label>
            <label className="v-check">
              <input defaultChecked={user?.notifyTips ?? true} name="notifyTips" type="checkbox" /> Astuce de la semaine
            </label>
            <SubmitButton className="btn btn-primary" pendingLabel="Enregistrement…">
              Enregistrer
            </SubmitButton>
          </form>
          <p className="v-small v-muted">Sur téléphone : activez les notifications dans Mon profil pour être prévenu même application fermée.</p>
        </aside>
      </div>
    </VendorShell>
  );
}
