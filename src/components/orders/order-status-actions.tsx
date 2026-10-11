import type { OrderConfirmationStatus, OrderProcessingStatus, StoreRole } from "@prisma/client";
import { SubmitButton } from "@/components/ui/submit-button";
import { hasPermission } from "@/modules/auth/permissions";
import { updateOrderStatus } from "@/modules/orders/management-actions";
import { isPendingReview, type OrderManagementIntent } from "@/modules/orders/status";

export function OrderStatusActions({
  orderId,
  confirmationStatus,
  processingStatus,
  role,
}: {
  orderId: string;
  confirmationStatus: OrderConfirmationStatus;
  processingStatus: OrderProcessingStatus;
  role: StoreRole;
}) {
  const button = (intent: OrderManagementIntent, label: string, pendingLabel: string, style = "primary-button") => (
    <form action={updateOrderStatus}>
      <input name="orderId" type="hidden" value={orderId} />
      <input name="intent" type="hidden" value={intent} />
      <SubmitButton className={style} pendingLabel={pendingLabel}>
        {label}
      </SubmitButton>
    </form>
  );

  if (isPendingReview(confirmationStatus, processingStatus)) {
    if (!hasPermission(role, "orders.manage")) return null;
    return (
      <div className="order-actions">
        {button("accept", "Confirmer la commande", "Confirmation…")}
        {button("decline", "Refuser", "Refus…", "secondary-button")}
      </div>
    );
  }

  if (confirmationStatus !== "CONFIRMED") return null;

  if (processingStatus === "ACCEPTED" && hasPermission(role, "orders.prepare")) {
    return (
      <div className="order-actions">
        {button("prepare", "Commencer la préparation", "Mise à jour…")}
        {hasPermission(role, "orders.manage") &&
          button("cancel", "Annuler la commande", "Annulation…", "secondary-button")}
      </div>
    );
  }

  if (processingStatus === "PREPARING" && hasPermission(role, "orders.prepare")) {
    return (
      <div className="order-actions">
        {button("complete", "Terminer la préparation", "Finalisation…")}
        {hasPermission(role, "orders.manage") &&
          button("cancel", "Annuler la commande", "Annulation…", "secondary-button")}
      </div>
    );
  }

  return null;
}
