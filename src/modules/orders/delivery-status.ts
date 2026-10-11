import { DeliveryStatus } from "@prisma/client";

export type DeliveryIntent =
  | "start"
  | "delivered"
  | "failed"
  | "reschedule"
  | "returned";

export function deliveryStatusTransition(
  status: DeliveryStatus,
  intent: DeliveryIntent,
): DeliveryStatus | null {
  if (status === DeliveryStatus.TO_ORGANIZE && intent === "start") {
    return DeliveryStatus.IN_TRANSIT;
  }
  if (status === DeliveryStatus.IN_TRANSIT && intent === "delivered") {
    return DeliveryStatus.DELIVERED;
  }
  if (status === DeliveryStatus.IN_TRANSIT && intent === "failed") {
    return DeliveryStatus.FAILED;
  }
  if (status === DeliveryStatus.FAILED && intent === "reschedule") {
    return DeliveryStatus.TO_ORGANIZE;
  }
  if (status === DeliveryStatus.FAILED && intent === "returned") {
    return DeliveryStatus.RETURNED;
  }
  return null;
}
