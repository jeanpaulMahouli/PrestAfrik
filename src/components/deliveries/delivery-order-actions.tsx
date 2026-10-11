import { DeliveryStatus, OrderProcessingStatus } from "@prisma/client";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  assignCourier,
  updateDeliveryStatus,
} from "@/modules/orders/delivery-actions";

type CourierOption = { id: string; name: string };

export function DeliveryOrderActions({
  orderId,
  deliveryStatus,
  processingStatus,
  deliveryMethod,
  couriers,
}: {
  orderId: string;
  deliveryStatus: DeliveryStatus;
  processingStatus: OrderProcessingStatus;
  deliveryMethod: string;
  couriers: CourierOption[];
}) {
  if (processingStatus !== OrderProcessingStatus.COMPLETED) {
    return <span className="delivery-help">Termine d’abord la préparation de la commande.</span>;
  }

  if (deliveryStatus === DeliveryStatus.TO_ORGANIZE) {
    if (deliveryMethod === "PICKUP") {
      return (
        <form action={updateDeliveryStatus} className="delivery-row-actions">
          <input name="orderId" type="hidden" value={orderId} />
          <input name="intent" type="hidden" value="start" />
          <SubmitButton className="secondary-button" pendingLabel="Mise à jour…">
            Préparer le retrait
          </SubmitButton>
        </form>
      );
    }

    if (!couriers.length) {
      return <span className="delivery-help">Ajoute un livreur pour lancer cette livraison.</span>;
    }

    return (
      <form action={assignCourier} className="delivery-row-actions">
        <input name="orderId" type="hidden" value={orderId} />
        <label className="visually-hidden" htmlFor={`courier-${orderId}`}>Livreur</label>
        <select id={`courier-${orderId}`} name="courierId" required>
          <option value="">Choisir un livreur</option>
          {couriers.map((courier) => (
            <option key={courier.id} value={courier.id}>{courier.name}</option>
          ))}
        </select>
        <SubmitButton className="secondary-button" pendingLabel="Affectation…">
          Assigner et démarrer
        </SubmitButton>
      </form>
    );
  }

  if (deliveryStatus === DeliveryStatus.IN_TRANSIT) {
    return (
      <div className="delivery-row-actions delivery-row-actions-wrap">
        <form action={updateDeliveryStatus}>
          <input name="orderId" type="hidden" value={orderId} />
          <input name="intent" type="hidden" value="delivered" />
          <SubmitButton className="primary-button" pendingLabel="Mise à jour…">
            Marquer livrée
          </SubmitButton>
        </form>
        <form action={updateDeliveryStatus}>
          <input name="orderId" type="hidden" value={orderId} />
          <input name="intent" type="hidden" value="failed" />
          <label className="visually-hidden" htmlFor={`failure-${orderId}`}>Motif de l’échec</label>
          <input
            id={`failure-${orderId}`}
            maxLength={500}
            minLength={3}
            name="failureReason"
            placeholder="Motif de l’échec"
            required
          />
          <SubmitButton className="secondary-button" pendingLabel="Mise à jour…">
            Échec
          </SubmitButton>
        </form>
      </div>
    );
  }

  if (deliveryStatus === DeliveryStatus.FAILED) {
    return (
      <div className="delivery-row-actions">
        <form action={updateDeliveryStatus}>
          <input name="orderId" type="hidden" value={orderId} />
          <input name="intent" type="hidden" value="reschedule" />
          <SubmitButton className="secondary-button" pendingLabel="Mise à jour…">
            Reprogrammer
          </SubmitButton>
        </form>
        <form action={updateDeliveryStatus}>
          <input name="orderId" type="hidden" value={orderId} />
          <input name="intent" type="hidden" value="returned" />
          <SubmitButton className="secondary-button" pendingLabel="Mise à jour…">
            Marquer retournée
          </SubmitButton>
        </form>
      </div>
    );
  }

  return <span className="delivery-help">Aucune action restante.</span>;
}
