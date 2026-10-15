import { notFound } from "next/navigation";
import Link from "next/link";
import { formatXaf } from "@/modules/catalog/format";
import { prisma } from "@/lib/prisma";
import { orderStage } from "@/modules/orders/state-machine";

const stageLabels = {
  NEW: "Reçue par la boutique",
  VALIDATED: "Validée",
  CANCELLED: "Annulée",
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
      processingStatus: true,
      createdAt: true,
      store: { select: { id: true, name: true, slug: true } },
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
        <h1>Merci, {order.customerName.split(" ")[0]} !</h1>
        <p>Votre commande a bien été reçue. La boutique vous contacte sur WhatsApp. Gardez ce lien pour suivre votre commande.</p>
        <dl className="order-tracking-status">
          <div><dt>Référence</dt><dd>{order.reference}</dd></div>
          <div><dt>Statut</dt><dd>{stageLabels[orderStage(order.processingStatus)]}</dd></div>
          <div><dt>Mode</dt><dd>{order.deliveryMethod === "PICKUP" ? "Retrait en boutique" : "Livraison"}</dd></div>
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
            <strong>{order.deliveryFeeXaf ? formatXaf(order.deliveryFeeXaf) : "Gratuit"}</strong>
          </div>
          <div className="receipt-line receipt-total">
            <span>Total</span>
            <strong>{formatXaf(order.totalXaf ?? order.subtotalXaf)}</strong>
          </div>
        </div>
        <p className="notice">
          Ce lien est personnel : ne le partagez pas.
        </p>
        <div className="page-actions no-print">
          <Link className="primary-button" href={`/boutique/${order.store.slug}`}>Retour à la boutique</Link>
        </div>
      </section>
    </main>
  );
}
