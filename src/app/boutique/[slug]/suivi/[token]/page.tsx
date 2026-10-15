import Link from "next/link";
import { notFound } from "next/navigation";
import { WhatsappAutoOpen } from "@/components/storefront/whatsapp-auto-open";
import { formatDateTime, formatReference, maskPhone } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { formatXaf } from "@/modules/catalog/format";
import { orderStage } from "@/modules/orders/state-machine";
import { getStorefrontExtras } from "@/modules/storefront/data";
import { renderTemplate } from "@/modules/whatsapp/templates";
import { buildWaMeUrl } from "@/modules/whatsapp/wa-me";
import { CheckIcon } from "@/components/ui/icons";

export const metadata = { title: "Ma commande", robots: { index: false, follow: false } };

/** Résultat et suivi d'une commande (lien personnel). Trois états : reçue, validée ou annulée. */
export default async function OrderTrackingPage({ params, searchParams }: PageProps<"/boutique/[slug]/suivi/[token]">) {
  const [{ slug, token }, query] = await Promise.all([params, searchParams]);
  if (!/^[\w-]{40,64}$/.test(token)) notFound();

  const order = await prisma.order.findUnique({
    where: { trackingToken: token },
    select: {
      reference: true,
      customerName: true,
      customerWhatsapp: true,
      deliveryCity: true,
      neighborhood: true,
      landmark: true,
      deliveryMethod: true,
      deliveryFeeXaf: true,
      subtotalXaf: true,
      totalXaf: true,
      processingStatus: true,
      createdAt: true,
      updatedAt: true,
      store: { select: { id: true, name: true, slug: true } },
      deliveryZone: { select: { estimatedDelay: true } },
      items: { select: { productName: true, variantName: true, quantity: true, lineTotalXaf: true } },
    },
  });
  if (!order || order.store.slug !== slug) notFound();

  const stage = orderStage(order.processingStatus);
  const isNew = query.nouvelle === "1";
  const firstName = order.customerName.trim().split(/\s+/)[0] ?? order.customerName;
  const total = order.totalXaf ?? order.subtotalXaf;
  const pickup = order.deliveryMethod === "PICKUP";
  const extras = await getStorefrontExtras(order.store.id);
  // « Commander sur WhatsApp » : le client envoie lui-même sa commande à la boutique.
  const whatsappUrl =
    extras.whatsappNumber && stage !== "CANCELLED"
      ? buildWaMeUrl(
          extras.whatsappNumber,
          renderTemplate(extras.customerTemplate, {
            storeName: order.store.name,
            customerName: order.customerName,
            reference: order.reference,
            items: order.items,
            totalXaf: total,
            deliveryMethod: order.deliveryMethod,
            city: order.deliveryCity,
            neighborhood: order.neighborhood,
            landmark: order.landmark,
          }),
        )
      : null;
  const wantsWhatsapp = isNew && query.whatsapp === "1" && whatsappUrl;
  const steps = [
    { label: "Commande reçue", date: order.createdAt, done: true },
    stage === "CANCELLED"
      ? { label: "Commande annulée", date: order.updatedAt, done: true, cancelled: true }
      : { label: pickup ? "Validée par la boutique" : "Validée et livrée", date: stage === "VALIDATED" ? order.updatedAt : null, done: stage === "VALIDATED" },
  ];

  return (
    <main className="sf-page sf-order">
      {isNew ? (
        <section className="sf-order-thanks">
          <span aria-hidden="true" className="sf-order-check"><CheckIcon size={24} /></span>
          <h1>Merci {firstName}, votre commande est enregistrée</h1>
          <p className="sf-order-ref">{formatReference(order.reference)}</p>
          {wantsWhatsapp ? (
            <>
              <p>Dernière étape : envoyez votre commande à la boutique sur WhatsApp. Le message est prêt, il suffit d’appuyer sur Envoyer.</p>
              <WhatsappAutoOpen href={whatsappUrl} />
            </>
          ) : (
            <p>{order.store.name} va vous contacter sur WhatsApp pour organiser {pickup ? "le retrait" : "la livraison"}.</p>
          )}
        </section>
      ) : (
        <div className="sf-page-head">
          <h1>Suivi de la commande</h1>
        </div>
      )}
      {!isNew && <p className="sf-muted">{formatReference(order.reference)} · {maskPhone(order.customerWhatsapp)}</p>}

      <ol className="sf-timeline">
        {steps.map((step) => (
          <li className={`${step.done ? "is-done" : ""} ${"cancelled" in step ? "is-cancelled" : ""}`} key={step.label}>
            <span aria-hidden="true" className="sf-timeline-dot">{"cancelled" in step ? "✕" : step.done ? <CheckIcon size={11} /> : ""}</span>
            <span>
              <strong>{step.label}</strong>
              {step.date && step.done && <small>{formatDateTime(step.date)}</small>}
              {!step.done && <small>En attente</small>}
            </span>
          </li>
        ))}
      </ol>

      <section aria-labelledby="order-summary" className="sf-panel">
        <h2 id="order-summary">Récapitulatif</h2>
        <ul className="sf-summary-lines">
          {order.items.map((item, index) => (
            <li key={`${item.productName}-${index}`}>
              <span>{item.productName}{item.variantName ? ` (${item.variantName.replace(/^[^:]+ : /, "")})` : ""} × {item.quantity}</span>
              <strong>{formatXaf(item.lineTotalXaf)}</strong>
            </li>
          ))}
        </ul>
        <dl className="sf-sums">
          <div>
            <dt>{pickup ? "Retrait en boutique" : "Livraison"}</dt>
            <dd>{order.deliveryFeeXaf ? formatXaf(order.deliveryFeeXaf) : "Gratuit"}</dd>
          </div>
          <div className="sf-sums-total">
            <dt>Total {stage === "VALIDATED" ? "payé" : "à payer à la livraison"}</dt>
            <dd>{formatXaf(total)}</dd>
          </div>
        </dl>
        <p className="sf-muted">
          {pickup ? "Retrait en boutique" : [order.deliveryCity, order.neighborhood].filter(Boolean).join(" · ")}
          {order.landmark && !pickup ? ` — ${order.landmark}` : ""}
          {!pickup && order.deliveryZone?.estimatedDelay ? ` · délai : ${order.deliveryZone.estimatedDelay}` : ""}
        </p>
      </section>

      <div className="sf-stack">
        {whatsappUrl && !wantsWhatsapp && (
          <a className="sf-btn sf-btn-secondary sf-btn-block" href={whatsappUrl} rel="noopener noreferrer" target="_blank">Écrire à la boutique sur WhatsApp</a>
        )}
        {isNew && <Link className="sf-btn sf-btn-secondary sf-btn-block" href={`/boutique/${slug}/suivi/${token}`}>Suivre ma commande</Link>}
        <Link className="sf-link" href={`/boutique/${slug}`}>Retour à la boutique</Link>
      </div>
      <p className="sf-muted sf-small">Ce lien est personnel : gardez-le pour suivre votre commande, ne le partagez pas.</p>
    </main>
  );
}
