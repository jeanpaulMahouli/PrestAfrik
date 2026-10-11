import Link from "next/link";
import { OrderProcessingStatus, Prisma } from "@prisma/client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/modules/stores/context";

const pageSize = 25;

export default async function OrdersPage({
  searchParams,
}: PageProps<"/dashboard/commandes">) {
  const { session, store, memberships, membership } = await requireStorePermission("orders.read");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const status = Object.values(OrderProcessingStatus).includes(
    params.etat as OrderProcessingStatus,
  )
    ? (params.etat as OrderProcessingStatus)
    : undefined;
  const currentPage = Math.max(1, Math.min(1000, Number(params.page) || 1));
  const where: Prisma.OrderWhereInput = {
    storeId: store.id,
    ...(status ? { processingStatus: status } : {}),
    ...(query
      ? {
          OR: [
            { reference: { contains: query, mode: "insensitive" } },
            { customerName: { contains: query, mode: "insensitive" } },
            { customerWhatsapp: { contains: query } },
          ],
        }
      : {}),
  };
  const [orders, total, pendingCount] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        reference: true,
        customerName: true,
        customerWhatsapp: true,
        deliveryCity: true,
        neighborhood: true,
        deliveryMethod: true,
        confirmationStatus: true,
        processingStatus: true,
        totalXaf: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
    prisma.order.count({
      where: {
        storeId: store.id,
        confirmationStatus: "PENDING",
        processingStatus: "TO_REVIEW",
      },
    }),
  ]);

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
          <h1 className="dashboard-heading">Commandes</h1>
          <p className="dashboard-copy">
            {total} commande{total === 1 ? "" : "s"} · {pendingCount} en attente de confirmation
          </p>
        </div>
      </div>

      <section className="surface-card order-list-card">
        <form className="order-filters" method="get">
          <label className="visually-hidden" htmlFor="order-search">Rechercher une commande</label>
          <input
            defaultValue={query}
            id="order-search"
            maxLength={100}
            name="q"
            placeholder="Référence, nom ou WhatsApp"
            type="search"
          />
          <label className="visually-hidden" htmlFor="order-status">Filtrer par statut</label>
          <select defaultValue={status ?? ""} id="order-status" name="etat">
            <option value="">Tous les statuts</option>
            {Object.values(OrderProcessingStatus).map((value) => (
              <option key={value} value={value}>{processingLabel(value)}</option>
            ))}
          </select>
          <SubmitButton className="secondary-button" pendingLabel="Filtrage…">Filtrer</SubmitButton>
        </form>

        {orders.length ? (
          <div className="responsive-table-wrap">
            <table className="data-table order-table">
              <thead>
                <tr>
                  <th scope="col">Commande</th>
                  <th scope="col">Client</th>
                  <th scope="col">Livraison</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Total</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link className="order-reference" href={`/dashboard/commandes/${order.id}`}>
                        {order.reference}
                      </Link>
                      <small>{order._count.items} article{order._count.items === 1 ? "" : "s"}</small>
                    </td>
                    <td>
                      <strong>{order.customerName}</strong>
                      <small>{order.customerWhatsapp}</small>
                    </td>
                    <td>
                      <strong>{order.deliveryCity}</strong>
                      <small>
                        {order.neighborhood || (order.deliveryMethod === "PICKUP" ? "Retrait boutique" : "Quartier non précisé")}
                      </small>
                    </td>
                    <td>
                      <OrderStatusBadge
                        confirmationStatus={order.confirmationStatus}
                        processingStatus={order.processingStatus}
                      />
                    </td>
                    <td>{order.totalXaf === null ? "À confirmer" : `${formatAmount(order.totalXaf)} FCFA`}</td>
                    <td>{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state order-empty">
            <h2>{query || status ? "Aucune commande trouvée" : "Pas encore de commande"}</h2>
            <p>
              {query || status
                ? "Modifie les filtres pour afficher d’autres commandes."
                : "Les commandes passées dans ta boutique apparaîtront ici."}
            </p>
          </div>
        )}

        {total > pageSize && (
          <nav aria-label="Pages des commandes" className="pagination">
            {currentPage > 1 && (
              <Link className="secondary-button" href={pageHref(query, status, currentPage - 1)}>
                Page précédente
              </Link>
            )}
            <span>Page {currentPage} sur {Math.ceil(total / pageSize)}</span>
            {currentPage * pageSize < total && (
              <Link className="secondary-button" href={pageHref(query, status, currentPage + 1)}>
                Page suivante
              </Link>
            )}
          </nav>
        )}
      </section>
      <p className="dashboard-copy order-payment-note">
        La livraison ne confirme pas l’encaissement.{" "}
        <Link href="/dashboard/argent">Enregistrer un paiement dans Argent reçu</Link>
      </p>
    </DashboardShell>
  );
}

function processingLabel(status: OrderProcessingStatus) {
  return {
    TO_REVIEW: "À confirmer",
    ACCEPTED: "Confirmée",
    PREPARING: "En préparation",
    COMPLETED: "Préparation terminée",
    CANCELLED: "Annulée",
  }[status];
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

function pageHref(query: string, status: OrderProcessingStatus | undefined, page: number) {
  const search = new URLSearchParams();
  if (query) search.set("q", query);
  if (status) search.set("etat", status);
  search.set("page", String(page));
  return `/dashboard/commandes?${search.toString()}`;
}
