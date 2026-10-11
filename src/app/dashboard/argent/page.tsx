import Link from "next/link";
import {
  PaymentMethod,
  PaymentType,
} from "@prisma/client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/modules/auth/permissions";
import { getPaymentDashboardMetrics } from "@/modules/payments/dashboard";
import { recordPayment, reversePayment } from "@/modules/payments/actions";
import { requireStorePermission } from "@/modules/stores/context";

const periods = [7, 30, 90] as const;

export default async function PaymentsPage({
  searchParams,
}: PageProps<"/dashboard/argent">) {
  const { session, store, memberships, membership } =
    await requireStorePermission("payments.read");
  const params = await searchParams;
  const periodValue = Number(firstValue(params.periode));
  const period = periods.find((days) => days === periodValue) ?? 30;
  const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
  const canManagePayments = hasPermission(membership.role, "payments.manage");

  const [metrics, entries, orders, couriers] = await Promise.all([
    getPaymentDashboardMetrics(store.id, since),
    prisma.payment.findMany({
      where: { storeId: store.id, createdAt: { gte: since } },
      select: {
        id: true,
        type: true,
        method: true,
        amountXaf: true,
        reference: true,
        note: true,
        createdAt: true,
        courierId: true,
        reversedBy: { select: { id: true } },
        reverses: { select: { id: true, type: true } },
        order: {
          select: {
            id: true,
            reference: true,
            customerName: true,
          },
        },
        author: { select: { name: true } },
        courier: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.order.findMany({
      where: {
        storeId: store.id,
        totalXaf: { not: null },
        processingStatus: { not: "CANCELLED" },
        confirmationStatus: { notIn: ["DECLINED", "EXPIRED"] },
      },
      select: { id: true, reference: true, customerName: true, totalXaf: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.courier.findMany({
      where: { storeId: store.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const requestedOrderId = firstValue(params.commande);
  const errorMessage = firstValue(params.erreur);
  const successMessage = paymentSuccess(firstValue(params.succes));
  const orderIsAvailable = orders.some((order) => order.id === requestedOrderId);

  return (
    <DashboardShell
      memberships={memberships}
      role={membership.role}
      store={store}
      userEmail={session.user.email}
      userName={session.user.name}
    >
      <div className="page-heading">
        <div>
          <h1 className="dashboard-heading">Argent reçu</h1>
          <p className="dashboard-copy">Suis les encaissements réels, séparément des commandes livrées.</p>
        </div>
        <a className="primary-button" href="#enregistrer-paiement">Enregistrer un paiement</a>
      </div>

      {errorMessage && (
        <p aria-live="polite" className="form-error notice-error" role="alert">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p aria-live="polite" className="notice" role="status">{successMessage}</p>
      )}

      <nav aria-label="Période des montants" className="payment-period-tabs">
        {periods.map((days) => (
          <Link
            aria-current={period === days ? "page" : undefined}
            className={period === days ? "payment-period active" : "payment-period"}
            href={`/dashboard/argent?periode=${days}`}
            key={days}
          >
            {days} jours
          </Link>
        ))}
      </nav>

      <section aria-label="Résumé des encaissements" className="payment-metrics">
        <article className="surface-card payment-metric-card">
          <p>Argent reçu</p>
          <strong>{formatAmount(metrics.receivedXaf)} FCFA</strong>
          <span>Écritures nettes sur {period} jours</span>
        </article>
        <article className="surface-card payment-metric-card">
          <p>Reste à recevoir</p>
          <strong>{formatAmount(metrics.remainingXaf)} FCFA</strong>
          <span>Sur les commandes non annulées</span>
        </article>
        <article className="surface-card payment-metric-card">
          <p>Collecté, non reversé</p>
          <strong>{formatAmount(Math.max(0, metrics.courierBalanceXaf))} FCFA</strong>
          <span>Solde actuel des collectes par livreur</span>
        </article>
      </section>

      <section className="surface-card payment-ledger-card" id="enregistrer-paiement">
        {canManagePayments && (
          <details className="payment-entry-details" open={firstValue(params.commande) ? true : undefined}>
            <summary>Enregistrer un paiement</summary>
            <form action={recordPayment} className="payment-entry-form">
              <label className="form-field">
                Commande
                <select defaultValue={orderIsAvailable ? requestedOrderId : ""} name="orderId" required>
                  <option value="">Choisir une commande</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.reference} · {order.customerName} · {formatAmount(order.totalXaf ?? 0)} FCFA
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                Type d’écriture
                <select defaultValue={PaymentType.PAYMENT_RECEIVED} name="type" required>
                  {Object.values(PaymentType)
                    .filter((type) => type !== PaymentType.REVERSAL)
                    .map((type) => <option key={type} value={type}>{paymentTypeLabel(type)}</option>)}
                </select>
              </label>
              <label className="form-field">
                Méthode
                <select defaultValue={PaymentMethod.CASH} name="method" required>
                  {Object.values(PaymentMethod).map((method) => (
                    <option key={method} value={method}>{paymentMethodLabel(method)}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                Montant en FCFA
                <input min="1" name="amountXaf" required type="number" />
              </label>
              <label className="form-field">
                Livreur (requis pour collecte ou reversement)
                <select defaultValue="" name="courierId">
                  <option value="">Aucun livreur</option>
                  {couriers.map((courier) => (
                    <option key={courier.id} value={courier.id}>{courier.name}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                Référence
                <input maxLength={120} name="reference" placeholder="Référence de transaction" />
              </label>
              <label className="form-field payment-note-field">
                Note
                <textarea maxLength={500} name="note" placeholder="Information complémentaire" rows={2} />
              </label>
              <p className="payment-form-help">
                Les écritures ne sont pas modifiables. Une erreur se corrige par une écriture inverse.
              </p>
              <SubmitButton className="primary-button" pendingLabel="Enregistrement…">
                Enregistrer
              </SubmitButton>
            </form>
          </details>
        )}

        <div className="payment-ledger-heading">
          <div>
            <h2>Historique des encaissements</h2>
            <p className="dashboard-copy">Les 100 écritures les plus récentes de la période.</p>
          </div>
        </div>
        {entries.length ? (
          <div className="responsive-table-wrap">
            <table className="data-table payment-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Commande</th>
                  <th scope="col">Type</th>
                  <th scope="col">Méthode</th>
                  <th scope="col">Montant</th>
                  <th scope="col">Auteur / livreur</th>
                  <th scope="col">Référence / note</th>
                  {canManagePayments && <th scope="col">Action</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td>
                      <Link className="order-reference" href={`/dashboard/commandes/${entry.order.id}`}>
                        {entry.order.reference}
                      </Link>
                      <small>{entry.order.customerName}</small>
                    </td>
                    <td>{entry.reverses ? `Annulation · ${paymentTypeLabel(entry.reverses.type)}` : paymentTypeLabel(entry.type)}</td>
                    <td>{paymentMethodLabel(entry.method)}</td>
                    <td>{entry.type === PaymentType.REVERSAL ? "−" : ""}{formatAmount(entry.amountXaf)} FCFA</td>
                    <td>{entry.author.name}{entry.courier ? <small>Livreur : {entry.courier.name}</small> : null}</td>
                    <td>
                      {entry.reference ?? "—"}
                      {entry.note && <small>{entry.note}</small>}
                    </td>
                    {canManagePayments && (
                      <td>
                        {!entry.reversedBy && entry.type !== PaymentType.REVERSAL && (
                          <form action={reversePayment}>
                            <input name="paymentId" type="hidden" value={entry.id} />
                            <label className="visually-hidden" htmlFor={`reverse-${entry.id}`}>Motif d’annulation</label>
                            <input className="payment-reversal-note" id={`reverse-${entry.id}`} maxLength={500} name="note" placeholder="Motif" />
                            <SubmitButton className="secondary-button" pendingLabel="Annulation…">
                              Annuler l’écriture
                            </SubmitButton>
                          </form>
                        )}
                        {entry.reversedBy && <span className="payment-reversed-label">Annulée</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state order-empty">
            <h2>Aucun encaissement sur cette période</h2>
            <p>Un statut « livrée » ne marque jamais un paiement comme reçu automatiquement.</p>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function paymentTypeLabel(type: PaymentType) {
  return {
    PAYMENT_RECEIVED: "Paiement reçu",
    PARTIAL_PAYMENT: "Paiement partiel",
    COURIER_COLLECTION: "Collecte par livreur",
    SETTLEMENT: "Reversement au vendeur",
    REFUND: "Remboursement",
    REVERSAL: "Écriture inverse",
  }[type];
}

function paymentMethodLabel(method: PaymentMethod) {
  return {
    CASH: "Espèces",
    MOBILE_MONEY: "Mobile Money",
    BANK_TRANSFER: "Virement",
    OTHER: "Autre",
  }[method];
}

function paymentSuccess(code: string | undefined) {
  return {
    paiement: "Le paiement a été enregistré.",
    annulation: "L’écriture inverse a été enregistrée.",
  }[code ?? ""] ?? "";
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Africa/Douala",
  }).format(date);
}
