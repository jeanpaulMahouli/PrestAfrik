import { Prisma } from "@prisma/client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import { getSimulatedMessage } from "@/modules/messaging/outbox";
import { simulatePendingMessagesAction } from "@/modules/messaging/actions";
import { requireStorePermission } from "@/modules/stores/context";
import Link from "next/link";
import { getStoreSubscriptionAccess } from "@/modules/subscriptions/service";

const eventLimit = 50;

type MessageOutboxRow = {
  id: string;
  aggregateId: string;
  type: string;
  payload: Prisma.JsonValue;
  attempts: number;
  availableAt: Date;
  processedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  orderReference: string | null;
  customerName: string | null;
  customerWhatsapp: string | null;
  followUpConsent: boolean | null;
  pendingCount: bigint;
  processableCount: bigint;
  simulatedCount: bigint;
};

export default async function MessagesPage({
  searchParams,
}: PageProps<"/dashboard/messages">) {
  const { session, store, memberships, membership } = await requireStorePermission("orders.read");
  const params = await searchParams;
  const now = new Date();
  const [events, subscription] = await Promise.all([prisma.$queryRaw<MessageOutboxRow[]>`
    SELECT
      event."id",
      event."aggregateId",
      event."type",
      event."payload",
      event."attempts",
      event."availableAt",
      event."processedAt",
      event."lastError",
      event."createdAt",
      order_row."reference" AS "orderReference",
      order_row."customerName",
      order_row."customerWhatsapp",
      order_row."followUpConsent",
      COUNT(*) FILTER (
        WHERE event."type" = 'ORDER_CONFIRMATION_REQUESTED'
          AND event."processedAt" IS NULL
      ) OVER () AS "pendingCount",
      COUNT(*) FILTER (
        WHERE event."type" = 'ORDER_CONFIRMATION_REQUESTED'
          AND event."processedAt" IS NULL
          AND event."availableAt" <= ${now}
      ) OVER () AS "processableCount",
      COUNT(*) FILTER (
        WHERE event."type" = 'ORDER_CONFIRMATION_REQUESTED'
          AND event."processedAt" IS NOT NULL
          AND event."lastError" IS NULL
      ) OVER () AS "simulatedCount"
    FROM "OutboxEvent" event
    LEFT JOIN "Order" order_row
      ON order_row."id" = event."aggregateId"
      AND order_row."storeId" = event."storeId"
    WHERE event."storeId" = ${store.id}
    ORDER BY event."createdAt" DESC
    LIMIT ${eventLimit}
  `, getStoreSubscriptionAccess(store.id)]);
  const metrics = events[0];
  const pendingCount = safeCount(metrics?.pendingCount ?? BigInt(0));
  const processableCount = safeCount(metrics?.processableCount ?? BigInt(0));
  const simulatedCount = safeCount(metrics?.simulatedCount ?? BigInt(0));

  return (
    <DashboardShell
      memberships={memberships}
      role={membership.role}
      store={store}
      userEmail={session.user.email}
      userName={session.user.name}
    >
      <div className="page-heading message-page-heading">
        <div>
          <h1 className="dashboard-heading">Messages</h1>
          <p className="dashboard-copy">
            Suivi des demandes WhatsApp créées avec les commandes de ta boutique.
          </p>
        </div>
        {processableCount > 0 && subscription.remainingMessages > 0 && (
          <form action={simulatePendingMessagesAction}>
            <SubmitButton className="primary-button" pendingLabel="Simulation…">
              Simuler les messages ({Math.min(processableCount, 20, subscription.remainingMessages)})
            </SubmitButton>
          </form>
        )}
      </div>

      <p className="notice message-simulation-notice" role="note">
        Mode simulation : aucun message WhatsApp réel n’est envoyé. Le traitement est limité à
        20 événements par action.
      </p>
      <p className="notice">
        Quota WhatsApp : {subscription.usedMessages} / {subscription.plan.monthlyMessageQuota} ce mois.
        {subscription.remainingMessages === 0 && <> <Link className="text-link" href="/dashboard/abonnement">Quota atteint : voir les offres</Link></>}
      </p>
      {subscription.featureRestricted && (
        <p className="notice" role="status">
          La période d’essai est expirée depuis au moins 7 jours. Les messages existants restent consultables.{" "}
          <Link className="text-link" href="/dashboard/abonnement">Choisir une offre</Link>
        </p>
      )}
      {typeof params.erreur === "string" && (
        <p className="form-error notice-error" role="alert">{params.erreur}</p>
      )}

      <div className="message-summary" aria-label="Résumé des messages">
        <section className="surface-card message-summary-card">
          <span>En attente</span>
          <strong>{pendingCount}</strong>
        </section>
        <section className="surface-card message-summary-card">
          <span>Messages simulés</span>
          <strong>{simulatedCount}</strong>
        </section>
      </div>

      <section className="surface-card message-log-card">
        <div className="message-log-heading">
          <h2>Historique de la boîte d’envoi</h2>
          <span>{events.length} / {eventLimit} événements récents</span>
        </div>
        {events.length ? (
          <div className="responsive-table-wrap">
            <table className="data-table message-table">
              <thead>
                <tr>
                  <th scope="col">Événement</th>
                  <th scope="col">Destinataire</th>
                  <th scope="col">État</th>
                  <th scope="col">Message simulé</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const message = getSimulatedMessage(event.payload);
                  const status = event.type !== "ORDER_CONFIRMATION_REQUESTED"
                    ? "Non pris en charge"
                    : event.processedAt
                    ? event.lastError
                      ? "Ignoré"
                      : "Simulé"
                    : event.availableAt > now
                      ? "En cours"
                      : "En attente";
                  const statusClass =
                    status === "Simulé"
                      ? "simulated"
                      : status === "En attente" || status === "En cours"
                        ? "pending"
                        : "ignored";
                  return (
                    <tr key={event.id}>
                      <td>
                        <strong>{event.type === "ORDER_CONFIRMATION_REQUESTED" ? "Confirmation de commande" : event.type}</strong>
                        <small>{event.orderReference ?? "Commande indisponible"} · {event.attempts} tentative{event.attempts === 1 ? "" : "s"}</small>
                      </td>
                      <td>
                        <strong>{event.customerName ?? "Client indisponible"}</strong>
                        <small>{event.customerWhatsapp ?? "Numéro indisponible"}</small>
                      </td>
                      <td>
                        <span className={`message-status message-status-${statusClass}`}>
                          {status}
                        </span>
                        {event.lastError && <small>{event.lastError}</small>}
                      </td>
                      <td className="message-body-cell">
                        {message ??
                          (event.type !== "ORDER_CONFIRMATION_REQUESTED"
                            ? "Ce type d’événement n’est pas traité par le simulateur."
                            : event.orderReference
                              ? event.followUpConsent
                                ? "Le message sera créé lors de la simulation."
                                : "Le consentement au suivi est absent ; aucun message ne sera simulé."
                              : "Commande indisponible ; aucun message ne sera simulé.")}
                      </td>
                      <td>{formatDate(event.processedAt ?? event.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state message-empty-state">
            <h2>Aucun message pour le moment</h2>
            <p>Les demandes de suivi apparaîtront ici après la création d’une commande.</p>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}

function safeCount(count: bigint) {
  const value = Number(count);
  if (!Number.isSafeInteger(value)) {
    throw new RangeError("Le nombre de messages dépasse la capacité d’affichage sécurisée.");
  }
  return value;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Douala",
  }).format(date);
}
