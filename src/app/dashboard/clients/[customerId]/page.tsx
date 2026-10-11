import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import {
  addCustomerNote,
  addCustomerTag,
  completeCustomerReminder,
  removeCustomerTag,
  resolveCustomerNameConflict,
  revokeCustomerMarketingConsent,
  scheduleCustomerReminder,
} from "@/modules/customers/actions";
import { customerNameIsMateriallyDifferent } from "@/modules/customers/validation";
import { requireStorePermission } from "@/modules/stores/context";

export default async function CustomerDetailPage({
  params,
  searchParams,
}: PageProps<"/dashboard/clients/[customerId]">) {
  const [{ customerId }, query] = await Promise.all([params, searchParams]);
  const { session, store, memberships, membership } = await requireStorePermission("customers.read");
  const customerPromise = prisma.customer.findFirst({
    where: { id: customerId, storeId: store.id },
    select: {
      id: true,
      name: true,
      whatsapp: true,
      email: true,
      firstOrderAt: true,
      lastOrderAt: true,
      orderCount: true,
      source: true,
      nameConflict: true,
      addresses: {
        orderBy: { lastUsedAt: "desc" },
        take: 50,
        select: { id: true, city: true, neighborhood: true, landmark: true, lastUsedAt: true },
      },
      tags: { orderBy: { name: "asc" }, select: { id: true, name: true } },
      notes: {
        where: { storeId: store.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      },
      reminders: {
        where: { storeId: store.id },
        orderBy: { remindAt: "asc" },
        take: 50,
        select: {
          id: true,
          remindAt: true,
          reason: true,
          completedAt: true,
          author: { select: { name: true } },
        },
      },
      consents: {
        where: { storeId: store.id },
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
        take: 100,
        select: { type: true, granted: true, source: true, recordedAt: true, revokedAt: true },
      },
      orders: {
        where: { storeId: store.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          reference: true,
          customerName: true,
          createdAt: true,
          totalXaf: true,
          confirmationStatus: true,
          processingStatus: true,
          payments: {
            select: {
              type: true,
              amountXaf: true,
              reverses: { select: { type: true, amountXaf: true } },
            },
          },
        },
      },
    },
  });
  const statsPromise = prisma.$queryRaw<{ orderCount: bigint; orderedXaf: bigint; receivedXaf: bigint }[]>`
    SELECT
      COUNT(order_row."id")::bigint AS "orderCount",
      COALESCE(
        SUM(order_row."totalXaf") FILTER (
          WHERE order_row."processingStatus" <> 'CANCELLED' AND order_row."totalXaf" IS NOT NULL
        ),
        0
      )::bigint AS "orderedXaf",
      COALESCE((
        SELECT SUM(
          CASE
            WHEN payment."type"::text IN ('PAYMENT_RECEIVED', 'PARTIAL_PAYMENT', 'COURIER_COLLECTION')
              THEN payment."amountXaf"::bigint
            WHEN payment."type"::text = 'REFUND'
              THEN -payment."amountXaf"::bigint
            WHEN payment."type"::text = 'REVERSAL'
              AND reversed."type"::text IN ('PAYMENT_RECEIVED', 'PARTIAL_PAYMENT', 'COURIER_COLLECTION')
              THEN -reversed."amountXaf"::bigint
            WHEN payment."type"::text = 'REVERSAL' AND reversed."type"::text = 'REFUND'
              THEN reversed."amountXaf"::bigint
            ELSE 0::bigint
          END
        )
        FROM "Payment" payment
        JOIN "Order" payment_order ON payment_order."id" = payment."orderId"
        LEFT JOIN "Payment" reversed ON reversed."id" = payment."reversesId"
        WHERE payment_order."customerId" = ${customerId}
          AND payment_order."storeId" = ${store.id}
          AND payment."storeId" = ${store.id}
      ), 0)::bigint AS "receivedXaf"
    FROM "Order" order_row
    WHERE order_row."customerId" = ${customerId}
      AND order_row."storeId" = ${store.id}
  `;
  const [customer, [stats]] = await Promise.all([customerPromise, statsPromise]);
  if (!customer) notFound();

  const latestConsent = new Map<string, (typeof customer.consents)[number]>();
  for (const consent of customer.consents) {
    if (!latestConsent.has(consent.type)) latestConsent.set(consent.type, consent);
  }
  const marketingConsent = latestConsent.get("MARKETING");
  const followUpConsent = latestConsent.get("ORDER_FOLLOW_UP");
  const hasMarketingConsent = Boolean(marketingConsent?.granted && !marketingConsent.revokedAt);
  const hasFollowUpConsent = Boolean(followUpConsent?.granted && !followUpConsent.revokedAt);
  const error = typeof query.erreur === "string" ? query.erreur : "";
  const nameConflicts = customer.orders.filter((order) =>
    customerNameIsMateriallyDifferent(customer.name, order.customerName),
  );

  return (
    <DashboardShell
      memberships={memberships}
      role={membership.role}
      store={store}
      userEmail={session.user.email}
      userName={session.user.name}
    >
      <div className="page-heading customer-detail-heading">
        <div>
          <Link className="text-link customer-back-link" href="/dashboard/clients">← Clients</Link>
          <h1 className="dashboard-heading">{customer.name}</h1>
          <p className="dashboard-copy">
            {customer.whatsapp} · Fiche créée par {sourceLabel(customer.source)}
          </p>
        </div>
        <div className="page-actions">
          <a
            className="secondary-button"
            href={`https://wa.me/${customer.whatsapp.replace(/\D/g, "")}`}
            rel="noreferrer"
            target="_blank"
          >
            Ouvrir WhatsApp
          </a>
        </div>
      </div>

      {error && <p className="form-error customer-form-error" role="alert">{error}</p>}

      {customer.nameConflict && (
        <section aria-labelledby="customer-conflict-title" className="notice customer-conflict-notice">
          <h2 id="customer-conflict-title">Vérifie le nom du client</h2>
          <p>Une commande récente utilise un nom très différent pour ce même numéro. Choisis le nom à conserver sur la fiche ; l’historique des commandes reste inchangé.</p>
          {nameConflicts.map((order) => (
            <div className="customer-conflict-choice" key={order.id}>
              <span>{order.customerName} · {order.reference}</span>
              <form action={resolveCustomerNameConflict}>
                <input name="customerId" type="hidden" value={customer.id} />
                <input name="orderId" type="hidden" value={order.id} />
                <SubmitButton className="secondary-button" pendingLabel="Mise à jour…">Conserver ce nom</SubmitButton>
              </form>
            </div>
          ))}
        </section>
      )}

      <section aria-label="Résumé du client" className="customer-detail-metrics">
        <article className="surface-card customer-detail-metric">
          <span>Commandes</span>
          <strong>{formatAmount(safeNumber(stats.orderCount))}</strong>
        </article>
        <article className="surface-card customer-detail-metric">
          <span>Montant commandé</span>
          <strong>{formatAmount(safeNumber(stats.orderedXaf))} FCFA</strong>
        </article>
        <article className="surface-card customer-detail-metric">
          <span>Argent reçu</span>
          <strong>{formatAmount(Math.max(0, safeNumber(stats.receivedXaf)))} FCFA</strong>
        </article>
      </section>

      <div className="customer-detail-grid">
        <div className="customer-detail-main">
          <section className="surface-card customer-detail-card">
            <h2>Coordonnées et consentements</h2>
            <dl className="customer-contact-list">
              <div><dt>Nom</dt><dd>{customer.name}</dd></div>
              <div><dt>WhatsApp</dt><dd>{customer.whatsapp}</dd></div>
              <div><dt>E-mail</dt><dd>{customer.email ?? "Non renseigné"}</dd></div>
              <div><dt>Source</dt><dd>{sourceLabel(customer.source)}</dd></div>
              <div><dt>Première commande</dt><dd>{customer.firstOrderAt ? formatDate(customer.firstOrderAt) : "Aucune commande"}</dd></div>
              <div><dt>Dernière commande</dt><dd>{customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "Aucune commande"}</dd></div>
              <div>
                <dt>Suivi de commande</dt>
                <dd>{hasFollowUpConsent ? "Accepté" : "Non actif"}</dd>
              </div>
              <div>
                <dt>Marketing</dt>
                <dd>
                  {hasMarketingConsent ? "Accepté" : "Non actif"}
                  {marketingConsent && <small> · {sourceLabel(marketingConsent.source)} · {formatDate(marketingConsent.recordedAt)}</small>}
                  {hasMarketingConsent && (
                    <form action={revokeCustomerMarketingConsent}>
                      <input name="customerId" type="hidden" value={customer.id} />
                      <SubmitButton className="text-button customer-revoke-button" pendingLabel="Retrait…">
                        Retirer le consentement
                      </SubmitButton>
                    </form>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="surface-card customer-detail-card">
            <h2>Adresses utilisées</h2>
            {customer.addresses.length ? (
              <ul className="customer-address-list">
                {customer.addresses.map((address) => (
                  <li key={address.id}>
                    <strong>{address.city}{address.neighborhood ? ` · ${address.neighborhood}` : ""}</strong>
                    {address.landmark && <span>{address.landmark}</span>}
                    <small>Utilisée le {formatDate(address.lastUsedAt)}</small>
                  </li>
                ))}
              </ul>
            ) : <p className="dashboard-copy">Aucune adresse enregistrée.</p>}
          </section>

          <section className="surface-card customer-detail-card">
            <h2>Historique des commandes</h2>
            {customer.orders.length ? (
              <div className="responsive-table-wrap">
                <table className="data-table customer-order-table">
                  <thead>
                    <tr><th scope="col">Commande</th><th scope="col">Nom saisi</th><th scope="col">Statut</th><th scope="col">Total</th><th scope="col">Date</th></tr>
                  </thead>
                  <tbody>
                    {customer.orders.map((order) => (
                      <tr key={order.id}>
                        <td><Link className="order-reference" href={`/dashboard/commandes/${order.id}`}>{order.reference}</Link></td>
                        <td>{order.customerName}</td>
                        <td><OrderStatusBadge confirmationStatus={order.confirmationStatus} processingStatus={order.processingStatus} /></td>
                        <td>{order.totalXaf === null ? "À confirmer" : `${formatAmount(order.totalXaf)} FCFA`}</td>
                        <td>{formatDate(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="dashboard-copy">Aucune commande pour le moment.</p>}
            {customer.orderCount > customer.orders.length && (
              <p className="dashboard-copy">Affichage des {customer.orders.length} commandes les plus récentes.</p>
            )}
          </section>
        </div>

        <aside className="customer-detail-aside">
          <section className="surface-card customer-detail-card">
            <h2>Tags</h2>
            <div className="customer-tag-list customer-detail-tags">
              {customer.tags.map((tag) => (
                <span className="customer-tag" key={tag.id}>
                  {tag.name}
                  <form action={removeCustomerTag}>
                    <input name="customerId" type="hidden" value={customer.id} />
                    <input name="tagId" type="hidden" value={tag.id} />
                    <button aria-label={`Retirer le tag ${tag.name}`} className="customer-tag-remove" type="submit">×</button>
                  </form>
                </span>
              ))}
              {!customer.tags.length && <p className="dashboard-copy">Aucun tag pour ce client.</p>}
            </div>
            <form action={addCustomerTag} className="customer-inline-form">
              <input name="customerId" type="hidden" value={customer.id} />
              <label className="visually-hidden" htmlFor="customer-add-tag">Ajouter un tag</label>
              <input id="customer-add-tag" maxLength={40} minLength={2} name="tag" placeholder="Ajouter un tag" required />
              <SubmitButton className="secondary-button" pendingLabel="Ajout…">Ajouter</SubmitButton>
            </form>
          </section>

          <section className="surface-card customer-detail-card">
            <h2>À recontacter</h2>
            <form action={scheduleCustomerReminder} className="customer-reminder-form">
              <input name="customerId" type="hidden" value={customer.id} />
              <label className="form-field">
                Date
                <input defaultValue={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} name="remindAt" required type="date" />
              </label>
              <label className="form-field">
                Motif
                <input maxLength={250} minLength={2} name="reason" placeholder="Ex. rappeler pour la nouvelle collection" required />
              </label>
              <SubmitButton className="secondary-button" pendingLabel="Programmation…">Programmer</SubmitButton>
            </form>
            <ul className="customer-reminder-list">
              {customer.reminders.map((reminder) => (
                <li className={reminder.completedAt ? "completed" : ""} key={reminder.id}>
                  <span><strong>{formatDate(reminder.remindAt)}</strong>{reminder.reason}</span>
                  {reminder.completedAt ? (
                    <small>Terminé le {formatDate(reminder.completedAt)}</small>
                  ) : (
                    <form action={completeCustomerReminder}>
                      <input name="customerId" type="hidden" value={customer.id} />
                      <input name="reminderId" type="hidden" value={reminder.id} />
                      <SubmitButton className="text-button" pendingLabel="…">Terminé</SubmitButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="surface-card customer-detail-card">
            <h2>Notes internes</h2>
            <form action={addCustomerNote} className="customer-note-form">
              <input name="customerId" type="hidden" value={customer.id} />
              <label className="visually-hidden" htmlFor="customer-note-content">Ajouter une note interne</label>
              <textarea id="customer-note-content" maxLength={1000} minLength={2} name="content" placeholder="Ajouter une information utile à l’équipe…" required rows={3} />
              <SubmitButton className="secondary-button" pendingLabel="Enregistrement…">Ajouter une note</SubmitButton>
            </form>
            <ul className="customer-note-list">
              {customer.notes.map((note) => (
                <li key={note.id}>
                  <p>{note.content}</p>
                  <small>{note.author.name} · {formatDate(note.createdAt)}</small>
                </li>
              ))}
              {!customer.notes.length && <li className="dashboard-copy">Aucune note interne.</li>}
            </ul>
          </section>

          <section className="surface-card customer-detail-card">
            <h2>Historique des consentements</h2>
            {customer.consents.length ? (
              <ul className="customer-consent-history">
                {customer.consents.map((consent, index) => (
                  <li key={`${consent.type}-${consent.recordedAt.toISOString()}-${index}`}>
                    <span>{consent.type === "MARKETING" ? "Marketing" : "Suivi WhatsApp"}</span>
                    <strong className={consent.granted && !consent.revokedAt ? "customer-consent accepted" : "customer-consent"}>
                      {consent.granted && !consent.revokedAt ? "Accepté" : "Non actif"}
                    </strong>
                    <small>{sourceLabel(consent.source)} · {formatDate(consent.recordedAt)}</small>
                  </li>
                ))}
              </ul>
            ) : <p className="dashboard-copy">Aucun consentement enregistré.</p>}
          </section>
        </aside>
      </div>
    </DashboardShell>
  );
}

function sourceLabel(source: string) {
  return {
    storefront: "boutique",
    manual: "saisie manuelle",
    import: "import",
    checkout: "commande en ligne",
    "seller-revocation": "retrait par la boutique",
  }[source] ?? source;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "Africa/Douala",
  }).format(date);
}

function safeNumber(value: bigint) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new RangeError("Le total client dépasse la capacité d’affichage sécurisée.");
  return number;
}
