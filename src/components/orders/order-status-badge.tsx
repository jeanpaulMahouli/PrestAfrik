import type { OrderConfirmationStatus, OrderProcessingStatus } from "@prisma/client";

const processingLabels: Record<OrderProcessingStatus, string> = {
  TO_REVIEW: "À confirmer",
  ACCEPTED: "Confirmée",
  PREPARING: "En préparation",
  COMPLETED: "Préparation terminée",
  CANCELLED: "Annulée",
};

const confirmationLabels: Record<OrderConfirmationStatus, string> = {
  PENDING: "Confirmation requise",
  CONFIRMED: "Client confirmé",
  CHANGE_REQUESTED: "Modification demandée",
  DECLINED: "Refusée",
  EXPIRED: "Expirée",
};

export function OrderStatusBadge({
  confirmationStatus,
  processingStatus,
}: {
  confirmationStatus: OrderConfirmationStatus;
  processingStatus: OrderProcessingStatus;
}) {
  const label =
    confirmationStatus === "DECLINED" ||
    confirmationStatus === "EXPIRED" ||
    confirmationStatus === "CHANGE_REQUESTED"
      ? confirmationLabels[confirmationStatus]
      : confirmationStatus === "PENDING" && processingStatus === "TO_REVIEW"
        ? confirmationLabels.PENDING
        : processingLabels[processingStatus];

  return (
    <span className={`status-badge order-status order-status-${processingStatus.toLowerCase()}`}>
      {label}
    </span>
  );
}
