import Link from "next/link";
import { AdminFeedback, searchValue } from "@/components/admin/admin-feedback";
import { PushComposer } from "@/components/admin/push-composer";
import { Badge } from "@/components/ui/badge";
import { BellRing, Smartphone, Users } from "@/components/ui/icons";
import { KpiCard } from "@/components/ui/kpi-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { audiences, audienceSizes, type Audience } from "@/modules/notifications/audiences";
import { lastManualPush, resetPushTemplate, updatePushTemplate } from "@/modules/push/admin-actions";
import { getPushTemplate, isPushConfigured } from "@/modules/push/sender";
import { defaultPushTemplates, pushKindInfo } from "@/modules/push/templates";

export const metadata = { title: "Notifications" };

const tabs = { envoyer: "Envoyer", automatiques: "Automatiques", historique: "Historique" } as const;
type Tab = keyof typeof tabs;
const automaticKinds = ["NEW_ORDER", "NEW_MESSAGE", "INACTIVITY"] as const;

/**
 * Administration → Notifications : envoyer une nouveauté ou une astuce (centre de notifications des vendeurs
 * et push), régler les notifications automatiques, voir l'historique.
 */
export default async function AdminPushPage({ searchParams }: PageProps<"/admin/notifications-push">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const tab: Tab = Object.hasOwn(tabs, searchValue(params, "onglet")) ? (searchValue(params, "onglet") as Tab) : "envoyer";
  const configured = isPushConfigured();
  const [devices, subscribers, last, sizes, recent] = await Promise.all([
    prisma.pushSubscription.count(),
    prisma.user.count({ where: { pushSubscriptions: { some: {} } } }),
    lastManualPush(),
    tab === "envoyer" ? audienceSizes() : null,
    prisma.pushNotificationLog.findMany({ where: { kind: { in: ["NEWS", "TIP"] }, sentById: { not: null }, createdAt: { gte: new Date(Date.now() - 86_400_000) } }, select: { audience: true } }),
  ]);
  const [templates, customized, logs] =
    tab === "automatiques"
      ? await Promise.all([Promise.all(automaticKinds.map((kind) => getPushTemplate(kind))), prisma.pushNotificationTemplate.findMany({ select: { kind: true } }), Promise.resolve([])])
      : tab === "historique"
        ? await Promise.all([Promise.resolve([]), Promise.resolve([]), prisma.pushNotificationLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 })])
        : [[], [], []];
  const customizedKinds = new Set(customized.map((row) => row.kind));
  const draft = last ? { title: last.title, body: last.body, url: last.url ?? "/dashboard", image: last.imageUrl } : { ...defaultPushTemplates.NEWS, image: null };

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Notifications</h1>
          <p className="v-page-subtitle">Cloche des vendeurs et notifications push.</p>
        </div>
      </div>
      <AdminFeedback params={params} />
      {!configured && (
        <p className="v-banner v-banner-warning">
          Push non configurées (clés <code>VAPID_PUBLIC_KEY</code> / <code>VAPID_PRIVATE_KEY</code>) : les envois vont seulement dans la cloche des vendeurs.
        </p>
      )}

      <section aria-label="Abonnés" className="kpi-grid">
        <KpiCard icon={Users} label="Vendeurs abonnés aux push" value={formatNumber(subscribers)} />
        <KpiCard icon={Smartphone} label="Appareils" tone="navy" value={formatNumber(devices)} />
        <KpiCard icon={BellRing} label="Envois ces 24 h" tone="blue" value={formatNumber(recent.length)} />
      </section>

      <nav aria-label="Notifications" className="pill-tabs">
        {(Object.keys(tabs) as Tab[]).map((key) => (
          <Link aria-current={tab === key ? "page" : undefined} href={key === "envoyer" ? "/admin/notifications-push" : `/admin/notifications-push?onglet=${key}`} key={key}>
            {tabs[key]}
          </Link>
        ))}
      </nav>

      {tab === "envoyer" && sizes && (
        <section className="v-card">
          <PushComposer
            audiences={(Object.keys(audiences) as Audience[]).map((key) => ({ key, ...audiences[key], ...sizes[key] }))}
            draft={draft}
            pushConfigured={configured}
            recentAudiences={recent.flatMap((row) => (row.audience ? [row.audience] : []))}
          />
        </section>
      )}

      {tab === "automatiques" && (
        <div className="push-auto-list">
          <p className="v-small v-muted">
            Aussi automatiques, dans la cloche seulement : astuce de la semaine (une par semaine), rappel des commandes en attente depuis 24 h (une fois par jour). Heures calmes : rien d’automatique entre 20 h et 9 h.
          </p>
          {templates.map((template) => {
            const info = pushKindInfo[template.kind];
            return (
              <details className="v-card push-auto" key={template.kind}>
                <summary>
                  <span>
                    <strong>{info.label}</strong>
                    <small className="v-muted">{info.when}</small>
                  </span>
                  <Badge tone={template.enabled ? "success" : "neutral"}>{template.enabled ? "Active" : "Coupée"}</Badge>
                </summary>
                <form action={updatePushTemplate} className="push-admin-form">
                  <input name="kind" type="hidden" value={template.kind} />
                  <label className="v-field">
                    Titre
                    <input defaultValue={template.title} maxLength={80} minLength={3} name="title" required />
                  </label>
                  <label className="v-field">
                    Message
                    <textarea defaultValue={template.body} maxLength={240} minLength={5} name="body" required rows={2} />
                    <span className="v-field-help">
                      Variables :{" "}
                      {info.variables.map((name) => (
                        <code className="push-admin-var" key={name}>{`{${name}}`}</code>
                      ))}
                    </span>
                  </label>
                  <label className="v-field">
                    Page ouverte au clic
                    <input defaultValue={template.url} maxLength={200} name="url" pattern="/.*" required />
                  </label>
                  <label className="v-check">
                    <input defaultChecked={template.enabled} name="enabled" type="checkbox" /> Active
                  </label>
                  <div className="push-admin-actions">
                    {customizedKinds.has(template.kind) && (
                      <button className="v-link-button" formAction={resetPushTemplate} formNoValidate type="submit">
                        Texte d’origine
                      </button>
                    )}
                    <SubmitButton className="btn btn-primary" pendingLabel="…">
                      Enregistrer
                    </SubmitButton>
                  </div>
                </form>
              </details>
            );
          })}
        </div>
      )}

      {tab === "historique" && (
        <section className="v-card v-card-flush">
          {logs.length ? (
            <table className="v-table admin-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Type</th>
                  <th scope="col">Message</th>
                  <th scope="col">Public</th>
                  <th scope="col">Vendeurs</th>
                  <th scope="col">Push reçus</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td data-label="Date">{formatDateTime(log.createdAt)}</td>
                    <td data-label="Type">{pushKindInfo[log.kind].label}</td>
                    <td className="v-cell-primary" data-label="Message">
                      {log.title}
                      <span className="v-cell-sub">{log.body}</span>
                    </td>
                    <td data-label="Public">{log.audience === "essai" ? "Essai" : log.audience ? (audiences[log.audience as Audience]?.label ?? log.audience) : "Automatique"}</td>
                    <td data-label="Vendeurs">{formatNumber(log.recipients)}</td>
                    <td data-label="Push reçus">{formatNumber(log.delivered)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="v-muted admin-card-empty">Aucun envoi pour le moment.</p>
          )}
        </section>
      )}
    </>
  );
}
