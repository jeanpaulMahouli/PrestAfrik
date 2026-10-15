import Link from "next/link";
import { notFound } from "next/navigation";
import { VendorShell } from "@/components/layout/vendor-shell";
import { OrderCustomerCard, OrderHistoryCard, OrderItemsCard, OrderQuickActions } from "@/components/orders/order-sections";
import { StatusBadge } from "@/components/ui/badge";
import { orderStageDisplay } from "@/config/statuses";
import { formatDateTime, formatReference } from "@/lib/format";
import { getOrderDetail } from "@/modules/orders/queries";
import { orderStage } from "@/modules/orders/state-machine";
import { requireStorePermission } from "@/modules/stores/context";
import { getWhatsappSettings } from "@/modules/whatsapp/settings";

const successMessages: Record<string, string> = {
  validee: "Commande validée ! Son montant est compté dans l’argent reçu.",
  annulee: "La commande est annulée.",
};

export const metadata = { title: "Détail de commande" };

export default async function OrderDetailPage({ params, searchParams }: PageProps<"/dashboard/commandes/[orderId]">) {
  const { store, membership } = await requireStorePermission("orders.read");
  const [{ orderId }, query] = await Promise.all([params, searchParams]);
  const [order, whatsapp] = await Promise.all([getOrderDetail(store.id, orderId), getWhatsappSettings(store.id)]);
  if (!order) notFound();

  const error = typeof query.erreur === "string" ? query.erreur : null;
  const success = typeof query.succes === "string" ? successMessages[query.succes] : null;

  return (
    <VendorShell>
      <Link className="v-back-link" href="/dashboard/commandes">
        ← Toutes les commandes
      </Link>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">
            Commande {formatReference(order.reference)} <StatusBadge status={orderStageDisplay[orderStage(order.processingStatus)]} />
          </h1>
          <p className="v-page-subtitle">Reçue le {formatDateTime(order.createdAt)}.</p>
        </div>
      </div>

      {error && <p className="v-banner v-banner-danger" role="alert">{error}</p>}
      {success && <p className="v-banner v-banner-success" role="status">{success}</p>}

      <OrderQuickActions order={order} returnTo={`/dashboard/commandes/${order.id}`} role={membership.role} showCancel storeName={store.name} storeTemplate={whatsapp.storeTemplate} />

      <div className="v-split order-detail-grid">
        <OrderItemsCard order={order} />
        <div className="v-stack">
          <OrderCustomerCard order={order} />
          <OrderHistoryCard order={order} />
        </div>
      </div>
    </VendorShell>
  );
}
