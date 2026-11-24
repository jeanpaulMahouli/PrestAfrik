import { MailCheck, MessageCircle } from "@/components/ui/icons";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminFeedback, currentPath, searchValue } from "@/components/admin/admin-feedback";
import { ReasonDialog } from "@/components/admin/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Tone } from "@/config/statuses";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { reopenAlert, resendVerificationEmail, resolveAllAlerts, suspendStore, updateAlert } from "@/modules/admin/actions";
import { alertKindLabels, listOpenAlerts, type AlertKind } from "@/modules/admin/alerts";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

export const metadata = { title: "Alertes" };

const tabs = { nouvelles: "Nouvelles", traitees: "Traitées" } as const;
type Tab = keyof typeof tabs;
const kindTones: Record<AlertKind, Tone> = { spam: "danger", orders: "warning", email: "neutral" };
const asKind = (value: string): AlertKind => (value === "spam" || value === "orders" ? value : "email");

export default async function AdminAlertsPage({ searchParams }: PageProps<"/admin/alertes">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  // Les demandes d'aide sont désormais dans la Messagerie (ancien onglet « Tickets de support »).
  if (searchValue(params, "onglet") === "tickets") redirect("/admin/avis?type=CONTACT");
  const tab: Tab = Object.hasOwn(tabs, searchValue(params, "onglet")) ? (searchValue(params, "onglet") as Tab) : "nouvelles";
  const [open, closed] = await Promise.all([
    listOpenAlerts(),
    tab === "traitees"
      ? prisma.adminAlertState.findMany({
          orderBy: { updatedAt: "desc" },
          take: 100,
          select: { key: true, status: true, level: true, title: true, body: true, updatedAt: true, updatedBy: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);
  const retour = currentPath("/admin/alertes", params);

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Alertes</h1>
        </div>
        {tab === "nouvelles" && open.length > 0 && (
          <form action={resolveAllAlerts} className="v-page-actions">
            <input name="retour" type="hidden" value={retour} />
            <SubmitButton className="btn btn-secondary" pendingLabel="Enregistrement…">Tout marquer comme traité</SubmitButton>
          </form>
        )}
      </div>
      <AdminFeedback params={params} />

      <nav aria-label="Filtrer les alertes" className="pill-tabs">
        {(Object.keys(tabs) as Tab[]).map((key) => (
          <Link aria-current={tab === key ? "page" : undefined} href={key === "nouvelles" ? "/admin/alertes" : `/admin/alertes?onglet=${key}`} key={key}>
            {tabs[key]}
            {key === "nouvelles" ? ` (${open.length})` : ""}
          </Link>
        ))}
      </nav>

      {tab === "nouvelles" &&
        (open.length ? (
          <ul className="admin-alerts">
            {open.map((alert) => (
              <li className={`v-card admin-alert admin-alert-${alert.kind === "spam" ? "urgent" : "important"}`} key={alert.key}>
                <div className="admin-alert-text">
                  <Badge tone={kindTones[alert.kind]}>{alertKindLabels[alert.kind]}</Badge>
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
                  {alert.kind === "email" && alert.userId && (
                    <form action={resendVerificationEmail}>
                      <input name="userId" type="hidden" value={alert.userId} />
                      <input name="retour" type="hidden" value={retour} />
                      <SubmitButton className="btn btn-primary" pendingLabel="Envoi…">
                        <MailCheck aria-hidden="true" size={16} /> Renvoyer l’e-mail de vérification
                      </SubmitButton>
                    </form>
                  )}
                  {alert.kind === "orders" && alert.store && (
                    <>
                      {alert.store.contactUrl && (
                        <a className="btn btn-secondary" href={alert.store.contactUrl} rel="noreferrer" target="_blank">
                          <WhatsAppIcon size={16} variant="logo" /> Contacter
                        </a>
                      )}
                      <form action={updateAlert}>
                        <input name="key" type="hidden" value={alert.key} />
                        <input name="status" type="hidden" value="RESOLVED" />
                        <input name="retour" type="hidden" value={retour} />
                        <SubmitButton className="btn btn-secondary" pendingLabel="…">Traitée</SubmitButton>
                      </form>
                    </>
                  )}
                  {alert.kind === "spam" && alert.store && (
                    <>
                      {alert.store.contactUrl ? (
                        <a className="btn btn-secondary" href={alert.store.contactUrl} rel="noreferrer" target="_blank">
                          {alert.store.contactUrl.startsWith("https://wa.me/") ? <WhatsAppIcon size={16} variant="logo" /> : <MessageCircle aria-hidden="true" size={16} />} Contacter
                        </a>
                      ) : (
                        <span className="v-small v-muted">Aucun contact renseigné</span>
                      )}
                      <form action={updateAlert}>
                        <input name="key" type="hidden" value={alert.key} />
                        <input name="status" type="hidden" value="RESOLVED" />
                        <input name="retour" type="hidden" value={retour} />
                        <SubmitButton className="btn btn-secondary" pendingLabel="…">Traitée</SubmitButton>
                      </form>
                      {!alert.store.suspended && (
                        <ReasonDialog
                          action={suspendStore}
                          description={`${alert.store.name} ne sera plus visible par ses clients. Le propriétaire sera prévenu par e-mail avec ce motif.`}
                          hiddenFields={{ storeId: alert.store.id, retour }}
                          placeholder="Ex. : publication massive de produits en double"
                          submitLabel="Suspendre la boutique"
                          title={`Suspendre ${alert.store.name} ?`}
                          triggerLabel="Suspendre la boutique"
                        />
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="v-card v-empty">
            <h2>Aucune nouvelle alerte</h2>
            <p>Aucune activité suspecte, aucun client sans réponse.</p>
          </div>
        ))}

      {tab === "traitees" &&
        (closed.length ? (
          <ul className="admin-alerts">
            {closed.map((alert) => (
              <li className="v-card admin-alert is-closed" key={alert.key}>
                <div className="admin-alert-text">
                  <Badge tone={kindTones[asKind(alert.level)]}>{alertKindLabels[asKind(alert.level)]}</Badge>
                  <h2>{alert.title}</h2>
                  <p>{alert.body}</p>
                  <small>
                    {alert.status === "IGNORED" ? "Ignorée" : "Traitée"} le {formatDateTime(alert.updatedAt)}
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
            ))}
          </ul>
        ) : (
          <div className="v-card v-empty">
            <h2>Aucune alerte traitée</h2>
            <p>L’historique (qui a traité quoi, et quand) apparaîtra ici.</p>
          </div>
        ))}

    </>
  );
}
