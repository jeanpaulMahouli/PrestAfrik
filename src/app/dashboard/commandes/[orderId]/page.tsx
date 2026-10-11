import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusActions } from "@/components/orders/order-status-actions";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/modules/stores/context";

export default async function OrderDetailPage({
  params,
  searchParams,
}: PageProps<"/dashboard/commandes/[orderId]">) {
  const { session, store, memberships, membership } = await requireStorePermission("orders.read");
  const [{ orderId }, query] = await Promise.all([params, searchParams]);
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
    select: {
      id: true,
      reference: true,
      customerName: true,
      customerWhatsapp: true,
      customerEmail: true,
      deliveryCity: true,
      neighborhood: true,
      landmark: true,
      deliveryComment: true,
      deliveryMethod: true,
      deliveryFeeXaf: true,
      subtotalXaf: true,
      totalXaf: true,
      confirmationStatus: true,
      processingStatus: true,
      deliveryStatus: true,
      paymentStatus: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          id: true,
          productName: true,
          variantName: true,
          sku: true,
          quantity: true,
          unitPriceXaf: true,
          lineTotalXaf: true,
        },
        orderBy: { productName: "asc" },
      },
      events: {
        select: { id: true, type: true, fromValue: true, toValue: true, note: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });
  if (!order) notFound();

  const errorMessage = orderErrorMessage(
    Array.isArray(query.erreur) ? query.erreur[0] : query.erreur,
  );
  const whatsappNumber = order.customerWhatsapp.replace(/[^\d]/g, "");
  const whatsappText = encodeURIComponent(
    `Bonjour ${order.customerName}, nous te contactons au sujet de la commande ${order.reference} passée chez ${store.name}.`,
  );

  return (
    <DashboardShell
      memberships={memberships}
      role={membership.role}
      store={store}
      userEmail={session.user.email}
      userName={session.user.name}
    >
      <div className="page-heading order-detail-heading">
        <div>
          <Link className="text-link" href="/dashboard/commandes">Retour aux commandes</Link>
          <h1 className="dashboard-heading">{order.reference}</h1>
          <p className="dashboard-copy">Reçue le {formatDate(order.createdAt)}</p>
        </div>
        <OrderStatusBadge
          confirmationStatus={order.confirmationStatus}
          processingStatus={order.processingStatus}
        />
      </div>

      {errorMessage && <p aria-live="polite" className="form-error notice-error" role="alert">{errorMessage}</p>}
      {query.succes === "statut" && <p aria-live="polite" className="notice" role="status">La commande a été mise à jour.</p>}

      <div className="order-detail-layout">
        <section className="surface-card order-detail-card">
          <div className="order-section-heading">
            <div>
              <h2>Articles commandés</h2>
              <p className="dashboard-copy">{order.items.length} article{order.items.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div className="order-items">
            {order.items.map((item) => (
              <article className="order-item" key={item.id}>
                <div>
                  <strong>{item.productName}</strong>
                  {item.variantName && <small>{item.variantName}</small>}
                  <small>Réf. {item.sku} · {formatAmount(item.unitPriceXaf)} FCFA / unité</small>
                </div>
                <span>× {item.quantity}</span>
                <strong>{formatAmount(item.lineTotalXaf)} FCFA</strong>
              </article>
            ))}
          </div>
          <div className="order-totals">
            <p><span>Sous-total</span><span>{formatAmount(order.subtotalXaf)} FCFA</span></p>
            <p>
              <span>Livraison</span>
              <span>{order.deliveryFeeXaf === null ? "À confirmer" : `${formatAmount(order.deliveryFeeXaf)} FCFA`}</span>
            </p>
            <p className="order-grand-total">
              <strong>Total à la livraison</strong>
              <strong>{order.totalXaf === null ? "À confirmer" : `${formatAmount(order.totalXaf)} FCFA`}</strong>
            </p>
          </div>
          <p className="order-payment-disclaimer">
            Paiement à la livraison. Le statut du paiement reste « en attente » jusqu’à confirmation effective de l’encaissement.
          </p>
        </section>

        <aside className="order-side-column">
          <section className="surface-card order-detail-card">
            <h2>Client</h2>
            <dl className="order-info-list">
              <div><dt>Nom</dt><dd>{order.customerName}</dd></div>
              <div><dt>WhatsApp</dt><dd><a href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`} rel="noreferrer" target="_blank">{order.customerWhatsapp}</a></dd></div>
              {order.customerEmail && <div><dt>E-mail</dt><dd><a href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a></dd></div>}
            </dl>
          </section>

          <section className="surface-card order-detail-card">
            <h2>Livraison</h2>
            <dl className="order-info-list">
              <div><dt>Mode</dt><dd>{order.deliveryMethod === "PICKUP" ? "Retrait en boutique" : "Livraison"}</dd></div>
              <div><dt>Ville</dt><dd>{order.deliveryCity}</dd></div>
              <div><dt>Quartier</dt><dd>{order.neighborhood || "Non précisé"}</dd></div>
              {order.landmark && <div><dt>Point de repère</dt><dd>{order.landmark}</dd></div>}
              {order.deliveryComment && <div><dt>Commentaire</dt><dd>{order.deliveryComment}</dd></div>}
            </dl>
          </section>

          <section className="surface-card order-detail-card">
            <h2>Suivi vendeur</h2>
            <OrderStatusActions
              confirmationStatus={order.confirmationStatus}
              orderId={order.id}
              processingStatus={order.processingStatus}
              role={membership.role}
            />
            <dl className="order-info-list order-secondary-status">
              <div><dt>Livraison</dt><dd>{deliveryLabel(order.deliveryStatus)}</dd></div>
              <div><dt>Paiement</dt><dd>{paymentLabel(order.paymentStatus)}</dd></div>
            </dl>
            <p className="dashboard-copy order-status-help">
              La fin de préparation ne signifie pas que la commande a été livrée ou payée.
            </p>
          </section>
        </aside>

        <section className="surface-card order-detail-card order-history">
          <h2>Historique</h2>
          {order.events.length ? (
            <ol className="order-event-list">
              {order.events.map((event) => (
                <li key={event.id}>
                  <span className="order-event-dot" />
                  <div>
                    <strong>{eventLabel(event.type)}</strong>
                    {event.note && <p>{event.note}</p>}
                    <small>{formatDate(event.createdAt)}</small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="dashboard-copy">Aucun événement enregistré.</p>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Douala",
  }).format(date);
}

function deliveryLabel(status: string) {
  return {
    TO_ORGANIZE: "À organiser",
    IN_TRANSIT: "En cours",
    DELIVERED: "Livrée",
    FAILED: "Échec",
    RETURNED: "Retournée",
    PICKUP: "Retrait en boutique",
  }[status] ?? status;
}

function paymentLabel(status: string) {
  return {
    PENDING: "En attente",
    PARTIAL: "Partiel",
    PAID: "Payé",
    REFUNDED: "Remboursé",
  }[status] ?? status;
}

function eventLabel(type: string) {
  return {
    CREATED: "Commande reçue",
    SELLER_ACCEPT: "Commande confirmée",
    SELLER_DECLINE: "Commande refusée",
    SELLER_PREPARE: "Préparation commencée",
    SELLER_COMPLETE: "Préparation terminée",
    SELLER_CANCEL: "Commande annulée",
  }[type] ?? "Mise à jour de commande";
}

function orderErrorMessage(error: string | undefined) {
  if (error === "non-autorise") return "Tu n’as pas les droits nécessaires pour cette action.";
  if (error === "operation-echouee") return "La commande a changé ou ne peut plus effectuer cette transition. Actualise la page et réessaie.";
  if (error === "action-invalide") return "L’action demandée n’est pas valide.";
  return "";
}
