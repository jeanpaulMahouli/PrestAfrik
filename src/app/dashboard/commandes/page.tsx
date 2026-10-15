import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { OrderQuickActions } from "@/components/orders/order-sections";
import { StatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { orderStageDisplay } from "@/config/statuses";
import { formatFcfa, formatReference, formatRelativeDay } from "@/lib/format";
import { hasPermission } from "@/modules/auth/permissions";
import { listOrders, orderTabs, ordersPageSize, parseOrderTab } from "@/modules/orders/queries";
import { orderStage } from "@/modules/orders/state-machine";
import { requireStorePermission } from "@/modules/stores/context";
import { getWhatsappSettings } from "@/modules/whatsapp/settings";

export const metadata = { title: "Commandes" };

const emptyMessages: Record<string, { title: string; text: string }> = {
  toutes: { title: "Pas encore de commande", text: "Vos prochains clients vous attendent ! Partagez votre boutique sur WhatsApp pour recevoir vos premières commandes." },
  nouvelles: { title: "Aucune nouvelle commande", text: "Tout est à jour. Les prochaines commandes apparaîtront ici." },
  validees: { title: "Aucune commande validée", text: "Touchez « Valider » sur une commande payée : son montant sera compté dans l’argent reçu." },
  annulees: { title: "Aucune commande annulée", text: "Tant mieux !" },
};

const successMessages: Record<string, string> = {
  validee: "Commande validée ! Son montant est compté dans l’argent reçu.",
  annulee: "La commande est annulée.",
};

export default async function OrdersPage({ searchParams }: PageProps<"/dashboard/commandes">) {
  const { store, membership } = await requireStorePermission("orders.read");
  const params = await searchParams;
  const tab = parseOrderTab(params.onglet);
  const page = Math.max(1, Math.min(1000, Number(params.page) || 1));
  const [{ orders, total, counts }, whatsapp] = await Promise.all([listOrders(store.id, tab, page), getWhatsappSettings(store.id)]);
  const href = (nextTab: string, nextPage = 1) => `/dashboard/commandes?onglet=${nextTab}${nextPage > 1 ? `&page=${nextPage}` : ""}`;
  const returnTo = href(tab, page);
  const success = typeof params.succes === "string" ? successMessages[params.succes] : null;
  const error = typeof params.erreur === "string" ? params.erreur : null;

  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Commandes</h1>
          <p className="v-page-subtitle">Écrivez au client sur WhatsApp, puis touchez « Valider » quand la commande est payée.</p>
        </div>
        {hasPermission(membership.role, "orders.export") && (
          <div className="v-page-actions">
            <a className="btn btn-secondary" download href={`/api/dashboard/commandes/export?onglet=${tab}`}>
              Exporter
            </a>
          </div>
        )}
      </div>

      {error && <p className="v-banner v-banner-danger" role="alert">{error}</p>}
      {success && <p className="v-banner v-banner-success" role="status">{success}</p>}

      <section className="v-card v-card-flush">
        <nav aria-label="Filtrer les commandes" className="v-tabs">
          {orderTabs.map((item) => (
            <Link aria-current={tab === item.key ? "page" : undefined} href={href(item.key)} key={item.key}>
              {item.label}
              {item.key !== "toutes" && counts[item.key] ? <span className="v-tab-count">{counts[item.key]}</span> : null}
            </Link>
          ))}
        </nav>

        {orders.length ? (
          <ul className="order-cards">
            {orders.map((order) => (
              <li className="order-card" key={order.id}>
                <div className="order-card-head">
                  <Link className="v-ref" href={`/dashboard/commandes/${order.id}`}>{formatReference(order.reference)}</Link>
                  <StatusBadge status={orderStageDisplay[orderStage(order.processingStatus)]} />
                  <span className="v-muted v-small">{formatRelativeDay(order.createdAt)}</span>
                </div>
                <div className="order-card-body">
                  <span className="order-card-customer">
                    <strong>{order.customerName}</strong>
                    <small>
                      {order.items.map((item) => `${item.productName} × ${item.quantity}`).join(", ")}
                      {" · "}
                      {order.deliveryMethod === "PICKUP" ? "Retrait en boutique" : [order.deliveryCity, order.neighborhood].filter(Boolean).join(", ")}
                    </small>
                  </span>
                  <strong className="order-card-total">{formatFcfa(order.totalXaf ?? order.subtotalXaf)}</strong>
                </div>
                <OrderQuickActions compact order={order} returnTo={returnTo} role={membership.role} storeName={store.name} storeTemplate={whatsapp.storeTemplate} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="v-empty">
            <h2>{emptyMessages[tab].title}</h2>
            <p>{emptyMessages[tab].text}</p>
            {tab === "toutes" && (
              <Link className="btn btn-primary" href="/dashboard">
                Partager ma boutique
              </Link>
            )}
          </div>
        )}
      </section>
      <Pagination href={(next) => href(tab, next)} page={page} pageSize={ordersPageSize} total={total} />
    </VendorShell>
  );
}
