import type { OrderProcessingStatus, StoreRole } from "@prisma/client";
import Link from "next/link";
import { ActionDialog } from "@/components/ui/action-dialog";
import { StoreImage } from "@/components/ui/store-image";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate, formatFcfa, formatRelativeDay, maskPhone } from "@/lib/format";
import { hasPermission } from "@/modules/auth/permissions";
import { cancelOrder, validateOrder } from "@/modules/orders/order-actions";
import { orderEventLabel, type OrderDetail } from "@/modules/orders/queries";
import { canCancel, canValidate, orderStage } from "@/modules/orders/state-machine";
import { renderTemplate } from "@/modules/whatsapp/templates";
import { buildWaMeUrl } from "@/modules/whatsapp/wa-me";
import { CheckIcon } from "@/components/ui/icons";
import { IconLink, IconSubmit } from "@/components/ui/icon-action";
import { CircleCheck, Eye } from "lucide-react";

export type QuickOrder = {
  id: string;
  reference: string;
  processingStatus: OrderProcessingStatus;
  customerName: string;
  customerWhatsapp: string;
  items: { productName: string; variantName: string | null; quantity: number }[];
  totalXaf: number | null;
  subtotalXaf: number;
  deliveryMethod: string;
  deliveryCity: string;
  neighborhood: string | null;
  landmark: string | null;
};

/** Lien wa.me vers le client avec le message de la boutique déjà rempli. */
export function customerWhatsappUrl(order: QuickOrder, storeName: string, storeTemplate: string) {
  const message = renderTemplate(storeTemplate, {
    storeName,
    customerName: order.customerName,
    reference: order.reference,
    items: order.items,
    totalXaf: order.totalXaf ?? order.subtotalXaf,
    deliveryMethod: order.deliveryMethod,
    city: order.deliveryCity,
    neighborhood: order.neighborhood,
    landmark: order.landmark,
  });
  return buildWaMeUrl(order.customerWhatsapp, message);
}

const whatsappIcon = (
  <svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
  </svg>
);

/**
 * Les seules actions d'une commande : écrire au client sur WhatsApp, la valider (l'argent est
 * compté comme reçu), la voir ; l'annulation est proposée sur la page de la commande.
 */
export function OrderQuickActions({
  order,
  storeName,
  storeTemplate,
  role,
  returnTo,
  compact = false,
  showCancel = false,
}: {
  order: QuickOrder;
  storeName: string;
  storeTemplate: string;
  role: StoreRole;
  returnTo: string;
  compact?: boolean;
  showCancel?: boolean;
}) {
  const stage = orderStage(order.processingStatus);
  const size = compact ? " btn-sm" : "";
  return (
    <div className="order-quick-actions">
      {stage !== "CANCELLED" && (
        <a
          aria-label={`Continuer sur WhatsApp avec ${order.customerName}`}
          className={`btn btn-whatsapp${size}`}
          href={customerWhatsappUrl(order, storeName, storeTemplate)}
          rel="noopener noreferrer"
          target="_blank"
        >
          {whatsappIcon}
          Continuer sur WhatsApp
        </a>
      )}
      {canValidate(stage) && hasPermission(role, "payments.manage") && (
        <form action={validateOrder}>
          <input name="orderId" type="hidden" value={order.id} />
          <input name="returnTo" type="hidden" value={returnTo} />
          {compact ? (
            // Liste : icône seule, avec infobulle (ordinateur) ou légende (écran tactile).
            <IconSubmit
              caption="Valider"
              hint="Valider (commande payée)"
              icon={<CircleCheck aria-hidden="true" size={20} />}
              label={`Valider la commande ${order.reference} : elle est payée, son montant est compté dans l’argent reçu`}
              pendingLabel="Validation…"
            />
          ) : (
            <SubmitButton aria-label={`Marquer la commande ${order.reference} validée`} className={`btn btn-primary${size}`} pendingLabel="Validation…">
              <CheckIcon /> Valider
            </SubmitButton>
          )}
        </form>
      )}
      {compact && (
        <IconLink caption="Voir" hint="Voir le détail" href={`/dashboard/commandes/${order.id}`} icon={<Eye aria-hidden="true" size={20} />} label={`Voir le détail de la commande ${order.reference}`} />
      )}
      {showCancel && canCancel(stage) && hasPermission(role, "orders.manage") && (
        <ActionDialog
          action={cancelOrder}
          description={
            stage === "VALIDATED"
              ? "Le montant sera retiré de l’argent reçu et les articles reviendront en stock."
              : "Les articles réservés reviendront en stock."
          }
          hiddenFields={{ orderId: order.id, returnTo }}
          pendingLabel="Annulation…"
          submitClassName="btn btn-danger"
          submitLabel="Oui, annuler"
          title="Annuler cette commande ?"
          triggerClassName="btn btn-secondary"
          triggerLabel="Annuler la commande"
        />
      )}
    </div>
  );
}

export function OrderItemsCard({ order }: { order: OrderDetail }) {
  const received = order.payments.find((payment) => payment.type === "PAYMENT_RECEIVED");
  return (
    <section aria-labelledby="order-items" className="v-card">
      <h2 className="v-card-title" id="order-items">Articles</h2>
      <ul className="order-lines">
        {order.items.map((item) => (
          <li key={item.id}>
            <span className="order-line-thumb">
              {item.product?.images[0] ? <StoreImage alt="" height={112} sizes="56px" src={item.product.images[0].url} width={112} /> : null}
            </span>
            <span className="order-line-name">
              <strong>{item.productName}</strong>
              {item.variantName && <small>{item.variantName.replace(/^[^:]+ : /, "")}</small>}
            </span>
            <span className="order-line-price">
              {item.quantity} × <strong>{formatFcfa(item.unitPriceXaf)}</strong>
            </span>
          </li>
        ))}
      </ul>
      <dl className="order-sums">
        <div>
          <dt>Articles</dt>
          <dd>{formatFcfa(order.subtotalXaf)}</dd>
        </div>
        <div>
          <dt>{order.deliveryMethod === "PICKUP" ? "Retrait en boutique" : `Livraison${order.deliveryZone ? ` (${order.deliveryZone.name})` : ""}`}</dt>
          <dd>{order.deliveryMethod === "PICKUP" || !order.deliveryFeeXaf ? "Gratuit" : formatFcfa(order.deliveryFeeXaf)}</dd>
        </div>
        <div className="order-sums-total">
          <dt>Total</dt>
          <dd>{formatFcfa(order.totalXaf ?? order.subtotalXaf)}</dd>
        </div>
      </dl>
      {received && orderStage(order.processingStatus) === "VALIDATED" && (
        <p className="v-banner v-banner-success order-received">Validée le {formatDate(received.receivedAt)} : {formatFcfa(received.amountXaf)} comptés dans l’argent reçu.</p>
      )}
    </section>
  );
}

export function OrderCustomerCard({ order }: { order: OrderDetail }) {
  const pickup = order.deliveryMethod === "PICKUP";
  return (
    <section aria-labelledby="order-customer" className="v-card">
      <h2 className="v-card-title" id="order-customer">Client et livraison</h2>
      <p className="order-customer-name">{order.customerName}</p>
      <p className="v-muted order-customer-phone">{maskPhone(order.customerWhatsapp)}</p>
      <dl className="order-facts">
        <div><dt>Mode</dt><dd>{pickup ? "Retrait en boutique" : "Livraison"}</dd></div>
        <div><dt>Adresse</dt><dd>{[order.deliveryCity, order.neighborhood, order.landmark].filter(Boolean).join(" · ")}</dd></div>
        {!pickup && order.deliveryZone?.estimatedDelay && <div><dt>Délai</dt><dd>{order.deliveryZone.estimatedDelay}</dd></div>}
        {order.deliveryComment && <div><dt>Note du client</dt><dd>{order.deliveryComment}</dd></div>}
      </dl>
      <Link className="v-link" href={`/dashboard/clients/${order.customerId}`}>Voir la fiche du client</Link>
    </section>
  );
}

export function OrderHistoryCard({ order }: { order: OrderDetail }) {
  return (
    <section aria-labelledby="order-history" className="v-card">
      <h2 className="v-card-title" id="order-history">Historique</h2>
      <ol className="order-rows order-history">
        {[...order.events].reverse().map((event) => (
          <li key={event.id}>
            <span className="v-muted">{formatRelativeDay(event.createdAt)}</span>
            <span>
              {orderEventLabel(event.type)}
              {event.actorId && order.actorNames[event.actorId] && <small className="v-muted"> — {order.actorNames[event.actorId]}</small>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
