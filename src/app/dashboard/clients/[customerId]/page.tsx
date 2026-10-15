import Link from "next/link";
import { notFound } from "next/navigation";
import { VendorShell } from "@/components/layout/vendor-shell";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { orderStageDisplay } from "@/config/statuses";
import { orderStage } from "@/modules/orders/state-machine";
import { formatDate, formatFcfa, formatPhone, formatReference, formatTime } from "@/lib/format";
import { hasPermission } from "@/modules/auth/permissions";
import {
  addCustomerNote,
  addCustomerTag,
  completeCustomerReminder,
  removeCustomerTag,
  resolveCustomerNameConflict,
  revokeCustomerMarketingConsent,
  scheduleCustomerReminder,
} from "@/modules/customers/actions";
import { getCustomerDetail } from "@/modules/customers/queries";
import { customerNameIsMateriallyDifferent } from "@/modules/customers/validation";
import { orderEventLabel } from "@/modules/orders/queries";
import { requireStorePermission } from "@/modules/stores/context";
import { buildWaMeUrl } from "@/modules/whatsapp/wa-me";
import { BackIcon } from "@/components/ui/icons";

export const metadata = { title: "Fiche client" };

const sourceLabels: Record<string, string> = { storefront: "Boutique en ligne", manuel: "Ajout manuel", manual: "Ajout manuel", import: "Import" };
const consentSourceLabels: Record<string, string> = { checkout: "le formulaire de commande", manual: "un ajout manuel", manuel: "un ajout manuel" };

export default async function CustomerDetailPage({ params, searchParams }: PageProps<"/dashboard/clients/[customerId]">) {
  const [{ customerId }, query] = await Promise.all([params, searchParams]);
  const { store, membership } = await requireStorePermission("customers.read");
  const detail = await getCustomerDetail(store.id, customerId);
  if (!detail) notFound();
  const { customer, stats, marketingConsent, followUpConsent, interactions } = detail;
  const canManage = hasPermission(membership.role, "customers.manage");
  const hasMarketing = Boolean(marketingConsent?.granted && !marketingConsent.revokedAt);
  const hasFollowUp = Boolean(followUpConsent?.granted && !followUpConsent.revokedAt);
  const remaining = Math.max(0, stats.orderedXaf - stats.receivedXaf);
  const nameConflicts = customer.orders.filter((order) => customerNameIsMateriallyDifferent(customer.name, order.customerName));
  const openReminders = customer.reminders.filter((reminder) => !reminder.completedAt);
  const error = typeof query.erreur === "string" ? query.erreur : null;
  const today = new Date(Date.now() + 3600_000).toISOString().slice(0, 10);

  return (
    <VendorShell>
      <Link className="v-back-link" href="/dashboard/clients"><BackIcon /> Tous les clients</Link>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">{customer.name}</h1>
          <p className="v-page-subtitle">Toute l’histoire de ce client avec votre boutique : commandes, échanges, notes et rappels.</p>
        </div>
        <div className="v-page-actions">
          {canManage && (
            <ActionDialog
              action={scheduleCustomerReminder}
              hiddenFields={{ customerId: customer.id }}
              submitLabel="Programmer le rappel"
              title="Ajouter un rappel"
              triggerLabel="Ajouter un rappel"
            >
              <label className="v-field">
                Date du rappel
                <input defaultValue={today} min={today} name="remindAt" required type="date" />
              </label>
              <label className="v-field">
                Pourquoi recontacter ce client ?
                <input maxLength={250} name="reason" placeholder="Ex. Proposer la nouvelle collection" required />
              </label>
            </ActionDialog>
          )}
          <a className="btn btn-primary" href={buildWaMeUrl(customer.whatsapp)} rel="noopener noreferrer" target="_blank">Ouvrir WhatsApp</a>
        </div>
      </div>

      {error && <p className="v-banner v-banner-danger" role="alert">{error}</p>}

      {customer.nameConflict && canManage && (
        <section aria-labelledby="conflict-title" className="v-banner">
          <h2 className="v-card-title" id="conflict-title">Vérifiez le nom de ce client</h2>
          <p className="v-small">Une commande récente utilise un nom très différent pour ce même numéro. Choisissez le nom à conserver ; l’historique des commandes reste inchangé.</p>
          <div className="v-button-row">
            {nameConflicts.map((order) => (
              <form action={resolveCustomerNameConflict} key={order.id}>
                <input name="customerId" type="hidden" value={customer.id} />
                <input name="orderId" type="hidden" value={order.id} />
                <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Mise à jour…">Garder « {order.customerName} »</SubmitButton>
              </form>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Chiffres du client" className="stat-grid customer-stats">
        <StatCard hint={`dont ${stats.cancelledCount} annulée${stats.cancelledCount > 1 ? "s" : ""}`} label="Commandes" value={String(stats.orderCount)} />
        <StatCard hint={customer.firstOrderAt ? `depuis le ${formatDate(customer.firstOrderAt)}` : "aucune commande"} label="Montant commandé" value={formatFcfa(stats.orderedXaf)} />
        <StatCard hint={remaining ? `reste ${formatFcfa(remaining)} à recevoir` : stats.orderedXaf ? "tout est encaissé" : "—"} label="Argent reçu" value={formatFcfa(stats.receivedXaf)} />
      </section>

      <div className="v-split">
        <div className="v-stack">
          <section aria-labelledby="customer-orders" className="v-card">
            <h2 className="v-card-title" id="customer-orders">Historique des commandes</h2>
            {customer.orders.length ? (
              <table className="v-table compact-table">
                <thead>
                  <tr>
                    <th scope="col">Commande</th>
                    <th scope="col">Date</th>
                    <th scope="col">Statut</th>
                    <th className="v-num" scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((order) => {
                    return (
                      <tr key={order.id}>
                        <td className="v-cell-primary"><Link className="v-ref v-ref-dark" href={`/dashboard/commandes/${order.id}`}>{formatReference(order.reference)}</Link></td>
                        <td data-label="Date">{formatDate(order.createdAt)}</td>
                        <td data-label="Statut"><StatusBadge status={orderStageDisplay[orderStage(order.processingStatus)]} /></td>
                        <td className="v-num" data-label="Total">{formatFcfa(order.totalXaf ?? order.subtotalXaf)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="v-muted v-small">Ce client n’a pas encore commandé.</p>
            )}
          </section>

          <section aria-labelledby="customer-notes" className="v-card">
            <h2 className="v-card-title" id="customer-notes">Notes</h2>
            {customer.notes.length > 0 && (
              <ul className="order-rows">
                {customer.notes.map((note) => (
                  <li key={note.id}>
                    <span className="v-muted">{note.author.name.split(" ")[0]} · {formatDate(note.createdAt).slice(0, 5)}</span>
                    <span>{note.content}</span>
                  </li>
                ))}
              </ul>
            )}
            {canManage && (
              <form action={addCustomerNote} className="inline-form">
                <input name="customerId" type="hidden" value={customer.id} />
                <label className="visually-hidden" htmlFor="note-content">Nouvelle note</label>
                <input id="note-content" maxLength={1000} name="content" placeholder="Ajouter une note" required />
                <SubmitButton className="btn btn-primary" pendingLabel="Ajout…">Ajouter</SubmitButton>
              </form>
            )}
          </section>

          <section aria-labelledby="customer-interactions" className="v-card">
            <h2 className="v-card-title" id="customer-interactions">Interactions</h2>
            {interactions.length ? (
              <ul className="order-rows">
                {interactions.map((event) => (
                  <li key={event.id}>
                    <span className="v-muted">{formatDate(event.createdAt).slice(0, 5)} {formatTime(event.createdAt)}</span>
                    <span>
                      {orderEventLabel(event.type)} <small className="v-muted">{formatReference(event.order.reference)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="v-muted v-small">Aucune interaction enregistrée pour l’instant.</p>
            )}
          </section>
        </div>

        <div className="v-stack">
          <section aria-labelledby="customer-contact" className="v-card">
            <h2 className="v-card-title" id="customer-contact">Coordonnées</h2>
            <dl className="order-facts">
              <div><dt>WhatsApp</dt><dd>{formatPhone(customer.whatsapp)}</dd></div>
              <div><dt>E-mail</dt><dd className="break-anywhere">{customer.email ?? "—"}</dd></div>
              <div><dt>Source</dt><dd>{sourceLabels[customer.source] ?? customer.source}</dd></div>
              <div><dt>Première commande</dt><dd>{customer.firstOrderAt ? formatDate(customer.firstOrderAt) : "—"}</dd></div>
              <div><dt>Dernière commande</dt><dd>{customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}</dd></div>
            </dl>
          </section>

          <section aria-labelledby="customer-addresses" className="v-card">
            <h2 className="v-card-title" id="customer-addresses">Adresses</h2>
            {customer.addresses.length ? (
              <ul className="address-list">
                {customer.addresses.map((address) => (
                  <li key={address.id}>
                    <span>{[address.city, address.neighborhood].filter(Boolean).join(" · ")}</span>
                    {address.landmark && <small>{address.landmark}</small>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="v-muted v-small">Aucune adresse enregistrée.</p>
            )}
          </section>

          <section aria-labelledby="customer-consents" className="v-card">
            <h2 className="v-card-title" id="customer-consents">Consentements</h2>
            <ul className="order-rows">
              <li>
                <span className="v-muted">Suivi WhatsApp</span>
                <span><Badge tone={hasFollowUp ? "success" : "neutral"}>{hasFollowUp ? "Accepté" : "Non donné"}</Badge></span>
              </li>
              <li>
                <span className="v-muted">Marketing</span>
                <span><Badge tone={hasMarketing ? "success" : "neutral"}>{hasMarketing ? "Accepté" : marketingConsent?.revokedAt ? "Retiré" : "Non donné"}</Badge></span>
              </li>
            </ul>
            {marketingConsent && (
              <p className="v-small v-muted">
                {hasMarketing
                  ? `Accepté le ${formatDate(marketingConsent.recordedAt)} via ${consentSourceLabels[marketingConsent.source] ?? marketingConsent.source}.`
                  : marketingConsent.revokedAt
                    ? `Retiré le ${formatDate(marketingConsent.revokedAt)}. Ce client ne recevra plus aucune campagne.`
                    : null}
              </p>
            )}
            {hasMarketing && canManage && (
              <ActionDialog
                action={revokeCustomerMarketingConsent}
                description="Le client sera retiré immédiatement de toutes les audiences marketing. Le suivi de ses commandes n’est pas concerné."
                hiddenFields={{ customerId: customer.id }}
                submitClassName="btn btn-danger"
                submitLabel="Retirer le consentement"
                title="Retirer le consentement marketing ?"
                triggerLabel="Retirer le consentement marketing"
              />
            )}
          </section>

          <section aria-labelledby="customer-tags" className="v-card">
            <h2 className="v-card-title" id="customer-tags">Tags et rappel</h2>
            <ul className="tag-list">
              {customer.tags.map((tag) => (
                <li key={tag.id}>
                  {tag.name}
                  {canManage && (
                    <form action={removeCustomerTag}>
                      <input name="customerId" type="hidden" value={customer.id} />
                      <input name="tagId" type="hidden" value={tag.id} />
                      <button aria-label={`Retirer le tag ${tag.name}`} type="submit">✕</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            {canManage && (
              <form action={addCustomerTag} className="inline-form">
                <input name="customerId" type="hidden" value={customer.id} />
                <label className="visually-hidden" htmlFor="new-tag">Nouveau tag</label>
                <input id="new-tag" maxLength={40} name="tag" placeholder="Ex. Fidèle" required />
                <SubmitButton className="btn btn-secondary" pendingLabel="Ajout…">Ajouter</SubmitButton>
              </form>
            )}
            {openReminders.map((reminder) => (
              <div className="reminder" key={reminder.id}>
                <div>
                  <strong>Rappel le {formatDate(reminder.remindAt)}</strong>
                  <p>{reminder.reason}</p>
                </div>
                {canManage && (
                  <form action={completeCustomerReminder}>
                    <input name="customerId" type="hidden" value={customer.id} />
                    <input name="reminderId" type="hidden" value={reminder.id} />
                    <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="…">Fait</SubmitButton>
                  </form>
                )}
              </div>
            ))}
          </section>
        </div>
      </div>
    </VendorShell>
  );
}
