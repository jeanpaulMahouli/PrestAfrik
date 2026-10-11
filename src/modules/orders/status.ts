import {
  OrderConfirmationStatus,
  OrderProcessingStatus,
  type OrderConfirmationStatus as ConfirmationStatus,
  type OrderProcessingStatus as ProcessingStatus,
} from "@prisma/client";

export type OrderManagementIntent = "accept" | "decline" | "prepare" | "complete" | "cancel";

export function orderStatusTransition(
  confirmationStatus: ConfirmationStatus,
  processingStatus: ProcessingStatus,
  intent: OrderManagementIntent,
) {
  if (
    intent === "accept" &&
    confirmationStatus === OrderConfirmationStatus.PENDING &&
    processingStatus === OrderProcessingStatus.TO_REVIEW
  ) {
    return {
      confirmationStatus: OrderConfirmationStatus.CONFIRMED,
      processingStatus: OrderProcessingStatus.ACCEPTED,
    };
  }

  if (
    intent === "decline" &&
    confirmationStatus === OrderConfirmationStatus.PENDING &&
    processingStatus === OrderProcessingStatus.TO_REVIEW
  ) {
    return {
      confirmationStatus: OrderConfirmationStatus.DECLINED,
      processingStatus: OrderProcessingStatus.CANCELLED,
    };
  }

  if (
    intent === "prepare" &&
    confirmationStatus === OrderConfirmationStatus.CONFIRMED &&
    processingStatus === OrderProcessingStatus.ACCEPTED
  ) {
    return {
      confirmationStatus,
      processingStatus: OrderProcessingStatus.PREPARING,
    };
  }

  if (
    intent === "complete" &&
    confirmationStatus === OrderConfirmationStatus.CONFIRMED &&
    processingStatus === OrderProcessingStatus.PREPARING
  ) {
    return {
      confirmationStatus,
      processingStatus: OrderProcessingStatus.COMPLETED,
    };
  }

  if (
    intent === "cancel" &&
    confirmationStatus === OrderConfirmationStatus.CONFIRMED &&
    (processingStatus === OrderProcessingStatus.ACCEPTED ||
      processingStatus === OrderProcessingStatus.PREPARING)
  ) {
    return {
      confirmationStatus,
      processingStatus: OrderProcessingStatus.CANCELLED,
    };
  }

  return null;
}

export function isPendingReview(
  confirmationStatus: ConfirmationStatus,
  processingStatus: ProcessingStatus,
) {
  return (
    confirmationStatus === OrderConfirmationStatus.PENDING &&
    processingStatus === OrderProcessingStatus.TO_REVIEW
  );
}
