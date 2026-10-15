export type CustomerSegmentFacts = {
  firstOrderAt: Date | null;
  lastOrderAt: Date | null;
  nonCancelledOrderCount: number;
  nextReminderAt: Date | null;
  hasUnconfirmedOrder?: boolean;
};

export function customerSegmentLabel(customer: CustomerSegmentFacts, now = new Date()) {
  if (customer.nextReminderAt && customer.nextReminderAt <= now) return "À recontacter";
  if (customer.hasUnconfirmedOrder) return "Commande à valider";
  if (customer.nonCancelledOrderCount >= 3) return "Client régulier";
  if (
    customer.firstOrderAt &&
    customer.firstOrderAt.getTime() >= now.getTime() - 30 * 24 * 60 * 60 * 1000
  ) {
    return "Nouveau client";
  }
  if (
    !customer.lastOrderAt ||
    customer.lastOrderAt.getTime() <= now.getTime() - 90 * 24 * 60 * 60 * 1000
  ) {
    return "Inactif";
  }
  return "Client";
}
