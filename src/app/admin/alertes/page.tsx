import Link from "next/link";
import { AdminFeedback, currentPath, searchValue } from "@/components/admin/admin-feedback";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Tone } from "@/config/statuses";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { reopenAlert, resolveAllAlerts, updateAlert } from "@/modules/admin/actions";
import { alertLevelLabels, listOpenAlerts, type AlertLevel } from "@/modules/admin/alerts";
import { requirePlatformAdmin } from "@/modules/admin/context";

export const metadata = { title: "Alertes" };

const tabs = { ouvertes: "Ouvertes", resolues: "Résolues", ignorees: "Ignorées" } as const;
type Tab = keyof typeof tabs;
const levelTones: Record<AlertLevel, Tone> = { urgent: "danger", important: "warning", info: "info" };
const asLevel = (level: string): AlertLevel => (level === "urgent" || level === "important" ? level : "info");

export default async function AdminAlertsPage({ searchParams }: PageProps<"/admin/alertes">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const tab: Tab = Object.hasOwn(tabs, searchValue(params, "onglet")) ? (searchValue(params, "onglet") as Tab) : "ouvertes";
  const [open, closed] = await Promise.all([
    listOpenAlerts(),
    tab === "ouvertes"
      ? Promise.resolve([])
      : prisma.adminAlertState.findMany({
          where: { status: tab === "resolues" ? "RESOLVED" : "IGNORED" },
          orderBy: { updatedAt: "desc" },
          take: 50,
          select: { key: true, level: true, title: true, body: true, updatedAt: true, updatedBy: { select: { name: true } } },
        }),
  ]);
  const retour = currentPath("/admin/alertes", params);

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Alertes</h1>
          <p className="v-page-subtitle">Les situations qui demandent l’attention de l’équipe PrestAfrik, classées par importance.</p>
        </div>
        {tab === "ouvertes" && open.length > 0 && (
          <form action={resolveAllAlerts} className="v-page-actions">
            <input name="retour" type="hidden" value={retour} />
            <SubmitButton className="btn btn-secondary" pendingLabel="Enregistrement…">Tout marquer comme traité</SubmitButton>
          </form>
        )}
      </div>
      <AdminFeedback params={params} />

      <nav aria-label="Filtrer les alertes" className="pill-tabs">
        {(Object.keys(tabs) as Tab[]).map((key) => (
          <Link aria-current={tab === key ? "page" : undefined} href={key === "ouvertes" ? "/admin/alertes" : `/admin/alertes?onglet=${key}`} key={key}>
            {tabs[key]}{key === "ouvertes" ? ` (${open.length})` : ""}
          </Link>
        ))}
      </nav>

      {tab === "ouvertes" ? (
        open.length ? (
          <ul className="admin-alerts">
            {open.map((alert) => (
              <li className={`v-card admin-alert admin-alert-${alert.level}`} key={alert.key}>
                <div className="admin-alert-text">
                  <Badge tone={levelTones[alert.level]}>{alertLevelLabels[alert.level]}</Badge>
                  <h2>{alert.title}</h2>
                  <p>{alert.body}</p>
                </div>
                <div className="admin-alert-actions">
                  <form action={updateAlert}>
                    <input name="key" type="hidden" value={alert.key} />
                    <input name="status" type="hidden" value="IGNORED" />
                    <input name="retour" type="hidden" value={retour} />
                    <SubmitButton className="btn btn-secondary" pendingLabel="…">Ignorer</SubmitButton>
                  </form>
                  <form action={updateAlert}>
                    <input name="key" type="hidden" value={alert.key} />
                    <input name="status" type="hidden" value="RESOLVED" />
                    <input name="retour" type="hidden" value={retour} />
                    <SubmitButton className="btn btn-secondary" pendingLabel="…">Traitée</SubmitButton>
                  </form>
                  <Link className="btn btn-primary" href={alert.action.href}>{alert.action.label}</Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="v-card v-empty">
            <h2>Aucune alerte ouverte</h2>
            <p>Tout va bien sur la plateforme. Les nouvelles situations à surveiller apparaîtront ici.</p>
          </div>
        )
      ) : closed.length ? (
        <ul className="admin-alerts">
          {closed.map((alert) => {
            const level = asLevel(alert.level);
            return (
              <li className={`v-card admin-alert admin-alert-${level} is-closed`} key={alert.key}>
                <div className="admin-alert-text">
                  <Badge tone={levelTones[level]}>{alertLevelLabels[level]}</Badge>
                  <h2>{alert.title}</h2>
                  <p>{alert.body}</p>
                  <small>
                    {tab === "resolues" ? "Traitée" : "Ignorée"} le {formatDateTime(alert.updatedAt)}
                    {alert.updatedBy ? ` par ${alert.updatedBy.name}` : ""}
                  </small>
                </div>
                <div className="admin-alert-actions">
                  <form action={reopenAlert}>
                    <input name="key" type="hidden" value={alert.key} />
                    <input name="retour" type="hidden" value={retour} />
                    <SubmitButton className="btn btn-secondary" pendingLabel="…">Rouvrir</SubmitButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="v-card v-empty">
          <h2>{tab === "resolues" ? "Aucune alerte traitée" : "Aucune alerte ignorée"}</h2>
        </div>
      )}
    </>
  );
}
