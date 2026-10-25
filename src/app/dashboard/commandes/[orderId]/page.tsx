import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { VendorShell } from "@/components/layout/vendor-shell";
import { OrderCustomerCard, OrderHistoryCard, OrderItemsCard, OrderQuickActions } from "@/components/orders/order-sections";
import { StatusBadge } from "@/components/ui/badge";
import { orderStageDisplay } from "@/config/statuses";
import { formatDateTime, formatReference } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { auth } from "@/modules/auth/server";
import { getOrderDetail } from "@/modules/orders/queries";
import { orderStage } from "@/modules/orders/state-machine";
import { requireStorePermission } from "@/modules/stores/context";
import { getWhatsappSettings } from "@/modules/whatsapp/settings";
import { BackIcon } from "@/components/ui/icons";

const successMessages: Record<string, string> = {
  validee: "Commande validée ! Son montant est compté dans l’argent reçu.",
  annulee: "La commande est annulée.",
};

export const metadata = { title: "Détail de commande" };

export default async function OrderDetailPage({ params, searchParams }: PageProps<"/dashboard/commandes/[orderId]">) {
  const [{ orderId }, query] = await Promise.all([params, searchParams]);
  const path = `/dashboard/commandes/${orderId}`;
  // Lien « Voir la commande » d'un e-mail : sans session, on revient sur cette commande après la connexion.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(`/connexion?next=${encodeURIComponent(path)}`);
  const { store, membership } = await requireStorePermission("orders.read");
  const [order, whatsapp] = await Promise.all([getOrderDetail(store.id, orderId), getWhatsappSettings(store.id)]);
  if (!order) {
    // Commande d'une autre boutique du vendeur (plusieurs boutiques) : on ouvre cette boutique, puis la commande.
    const other = await prisma.order.findFirst({
      where: { id: orderId, store: { memberships: { some: { userId: session.user.id } } } },
      select: { storeId: true },
    });
    if (other) redirect(`/api/dashboard/boutique-active?boutique=${other.storeId}&suite=${encodeURIComponent(path)}`);
    notFound();
  }

  const error = typeof query.erreur === "string" ? query.erreur : null;
  const success = typeof query.succes === "string" ? successMessages[query.succes] : null;

  return (
    <VendorShell>
      <Link className="v-back-link" href="/dashboard/commandes">
        <BackIcon /> Toutes les commandes
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
