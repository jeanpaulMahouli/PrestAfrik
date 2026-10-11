import { notFound } from "next/navigation";
import Link from "next/link";
import { PrintReceiptButton } from "@/components/orders/print-receipt-button";
import { formatXaf } from "@/modules/catalog/format";
import { prisma } from "@/lib/prisma";

const confirmationLabels = {
  PENDING: "En attente de ta confirmation",
  CONFIRMED: "Confirmée",
  CHANGE_REQUESTED: "Modification demandée",
  DECLINED: "Annulée",
  EXPIRED: "Expirée",
} as const;

const processingLabels = {
  TO_REVIEW: "À vérifier par la boutique",
  ACCEPTED: "Acceptée",
  PREPARING: "En préparation",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
} as const;

const deliveryLabels = {
  TO_ORGANIZE: "Livraison à organiser",
  IN_TRANSIT: "En cours de livraison",
  DELIVERED: "Livrée",
  FAILED: "Livraison échouée",
  RETURNED: "Retournée",
  PICKUP: "Retrait en boutique",
} as const;

export async function generateMetadata({ params }: PageProps<"/commande/suivi/[token]">) {
  const { token } = await params;
  const order = await prisma.order.findUnique({
    where: { trackingToken: token },
    select: { reference: true },
  });
  return { title: order ? `Suivi de la commande ${order.reference}` : "Commande introuvable" };
}

export default async function OrderTrackingPage({
  params,
}: PageProps<"/commande/suivi/[token]">) {
  const { token } = await params;
  if (!/^[\w-]{40,64}$/.test(token)) notFound();

  const order = await prisma.order.findUnique({
    where: { trackingToken: token },
    select: {
      reference: true,
      customerName: true,
      deliveryCity: true,
      neighborhood: true,
      landmark: true,
      deliveryMethod: true,
      deliveryFeeXaf: true,
      subtotalXaf: true,
      totalXaf: true,
      confirmationStatus: true,
      processingStatus: true,
      deliveryStatus: true,
      createdAt: true,
      store: { select: { name: true, slug: true } },
      items: {
        select: { productName: true, variantName: true, quantity: true, unitPriceXaf: true, lineTotalXaf: true },
      },
    },
  });
  if (!order) notFound();

  return (
    <main className="order-tracking-page">
      <section className="surface-card order-receipt">
        <p className="dashboard-copy">Commande enregistrée · {order.store.name}</p>
        <h1>Merci, {order.customerName.split(" ")[0]}.</h1>
        <p>Ta commande a bien été enregistrée. Tu peux revenir ici pour la suivre.</p>
        <dl className="order-tracking-status">
          <div><dt>Référence</dt><dd>{order.reference}</dd></div>
          <div><dt>Confirmation</dt><dd>{confirmationLabels[order.confirmationStatus]}</dd></div>
          <div><dt>Préparation</dt><dd>{processingLabels[order.processingStatus]}</dd></div>
          <div><dt>Livraison</dt><dd>{deliveryLabels[order.deliveryStatus]}</dd></div>
          <div><dt>Ville</dt><dd>{order.deliveryCity}</dd></div>
          <div><dt>Quartier</dt><dd>{order.neighborhood ?? "—"}</dd></div>
          {order.landmark && <div><dt>Repère</dt><dd>{order.landmark}</dd></div>}
          <div><dt>Date</dt><dd>{order.createdAt.toLocaleString("fr-FR", { timeZone: "Africa/Douala" })}</dd></div>
        </dl>
        <h2>Récapitulatif</h2>
        <div className="receipt-lines">
          {order.items.map((item, index) => (
            <div className="receipt-line" key={`${item.productName}-${item.variantName}-${index}`}>
              <span>{item.productName}{item.variantName ? ` · ${item.variantName}` : ""} × {item.quantity}</span>
              <strong>{formatXaf(item.lineTotalXaf)}</strong>
            </div>
          ))}
          <div className="receipt-line"><span>Sous-total</span><strong>{formatXaf(order.subtotalXaf)}</strong></div>
          <div className="receipt-line">
            <span>Livraison</span>
            <strong>{order.deliveryFeeXaf === null ? "Frais à confirmer" : formatXaf(order.deliveryFeeXaf)}</strong>
          </div>
          <div className="receipt-line receipt-total">
            <span>À payer à la livraison</span>
            <strong>{order.totalXaf === null ? "Montant à confirmer" : formatXaf(order.totalXaf)}</strong>
          </div>
        </div>
        <p className="notice">
          Le numéro de cette page est privé. Garde le lien pour suivre ta commande.
        </p>
        <div className="page-actions no-print">
          <PrintReceiptButton />
          <Link className="primary-button" href={`/boutique/${order.store.slug}`}>Retour à la boutique</Link>
        </div>
      </section>
    </main>
  );
}
