import { MailCheck, MessageCircle } from "lucide-react";
import Link from "next/link";
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
import { replyToTicket, updateTicket } from "@/modules/support/actions";

export const metadata = { title: "Alertes" };

const tabs = { nouvelles: "Nouvelles", traitees: "Traitées", tickets: "Tickets de support" } as const;
type Tab = keyof typeof tabs;
const kindTones: Record<AlertKind, Tone> = { spam: "danger", email: "warning" };
const ticketStatusLabels = { OPEN: "Ouvert", IN_PROGRESS: "En cours", RESOLVED: "Résolu" } as const;
const ticketStatusTones: Record<keyof typeof ticketStatusLabels, Tone> = { OPEN: "warning", IN_PROGRESS: "info", RESOLVED: "success" };
const asKind = (value: string): AlertKind => (value === "spam" ? "spam" : "email");

export default async function AdminAlertsPage({ searchParams }: PageProps<"/admin/alertes">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const tab: Tab = Object.hasOwn(tabs, searchValue(params, "onglet")) ? (searchValue(params, "onglet") as Tab) : "nouvelles";
  const ticketFilter = searchValue(params, "statut");
  const [open, closed, tickets, openTickets, admins] = await Promise.all([
    listOpenAlerts(),
    tab === "traitees"
      ? prisma.adminAlertState.findMany({
          orderBy: { updatedAt: "desc" },
          take: 100,
          select: { key: true, status: true, level: true, title: true, body: true, updatedAt: true, updatedBy: { select: { name: true } } },
        })
      : Promise.resolve([]),
    tab === "tickets"
      ? prisma.supportTicket.findMany({
          where: ticketFilter === "OPEN" || ticketFilter === "IN_PROGRESS" || ticketFilter === "RESOLVED" ? { status: ticketFilter } : {},
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          take: 100,
          include: {
            assignedTo: { select: { id: true, name: true } },
            replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
          },
        })
      : Promise.resolve([]),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
    prisma.user.findMany({ where: { platformRole: { in: ["ADMIN", "SUPER_ADMIN"] }, suspendedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const retour = currentPath("/admin/alertes", params);
  const selectedTicket = searchValue(params, "ticket");

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Alertes</h1>
          <p className="v-page-subtitle">E-mails non vérifiés, suspicions de spam et demandes d’aide : ce qui demande l’attention de l’équipe PrestAfrik.</p>
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
            {key === "nouvelles" ? ` (${open.length})` : key === "tickets" && openTickets ? ` (${openTickets} ouvert${openTickets > 1 ? "s" : ""})` : ""}
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
                  {alert.kind === "spam" && alert.store && (
                    <>
                      {alert.store.contactUrl ? (
                        <a className="btn btn-secondary" href={alert.store.contactUrl} rel="noreferrer" target="_blank">
                          <MessageCircle aria-hidden="true" size={16} /> Contacter
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
            <p>Toutes les adresses e-mail sont confirmées et aucune activité suspecte n’a été repérée.</p>
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

      {tab === "tickets" && (
        <>
          <nav aria-label="Statut des demandes" className="pill-tabs pill-tabs-sm">
            {[["", "Toutes"], ["OPEN", "Ouvertes"], ["IN_PROGRESS", "En cours"], ["RESOLVED", "Résolues"]].map(([value, label]) => (
              <Link aria-current={ticketFilter === value ? "page" : undefined} href={`/admin/alertes?onglet=tickets${value ? `&statut=${value}` : ""}`} key={label}>
                {label}
              </Link>
            ))}
          </nav>
          {tickets.length ? (
            <ul className="admin-alerts">
              {tickets.map((ticket) => (
                <li className="v-card ticket" key={ticket.id}>
                  <details open={selectedTicket === ticket.id || tickets.length === 1}>
                    <summary className="ticket-summary">
                      <Badge tone={ticketStatusTones[ticket.status]}>{ticketStatusLabels[ticket.status]}</Badge>
                      <strong>{ticket.subject}</strong>
                      <span className="v-muted v-small">
                        {ticket.requesterName} · {formatDateTime(ticket.createdAt)}
                        {ticket.assignedTo ? ` · suivi par ${ticket.assignedTo.name}` : " · non assigné"}
                      </span>
                    </summary>
                    <div className="ticket-body">
                      <p className="v-small v-muted">
                        De {ticket.requesterName} (<a href={`mailto:${ticket.requesterEmail}`}>{ticket.requesterEmail}</a>)
                      </p>
                      <blockquote className="ticket-message">{ticket.message}</blockquote>
                      {ticket.replies.map((reply) => (
                        <div className="ticket-reply" key={reply.id}>
                          <small>
                            Réponse de {reply.author?.name ?? "l’équipe"} le {formatDateTime(reply.createdAt)}
                          </small>
                          <p>{reply.body}</p>
                        </div>
                      ))}
                      <form action={replyToTicket} className="ticket-form">
                        <input name="ticketId" type="hidden" value={ticket.id} />
                        <label className="v-field">
                          Répondre par e-mail à {ticket.requesterName}
                          <textarea maxLength={4000} minLength={5} name="body" placeholder="Bonjour, merci pour votre message…" required rows={4} />
                        </label>
                        <SubmitButton className="btn btn-primary" pendingLabel="Envoi…">Envoyer la réponse</SubmitButton>
                      </form>
                      <form action={updateTicket} className="ticket-settings">
                        <input name="ticketId" type="hidden" value={ticket.id} />
                        <label className="v-field">
                          Statut
                          <select defaultValue={ticket.status} name="status">
                            {(Object.keys(ticketStatusLabels) as (keyof typeof ticketStatusLabels)[]).map((status) => (
                              <option key={status} value={status}>{ticketStatusLabels[status]}</option>
                            ))}
                          </select>
                        </label>
                        <label className="v-field">
                          Suivi par
                          <select defaultValue={ticket.assignedTo?.id ?? ""} name="assignedToId">
                            <option value="">Personne</option>
                            {admins.map((admin) => (
                              <option key={admin.id} value={admin.id}>{admin.name}</option>
                            ))}
                          </select>
                        </label>
                        <SubmitButton className="btn btn-secondary" pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
                      </form>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          ) : (
            <div className="v-card v-empty">
              <h2>Aucune demande d’aide</h2>
              <p>Les messages envoyés depuis la page Contact du site arrivent ici, prêts à être suivis.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
