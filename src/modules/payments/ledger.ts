import { PaymentStatus, PaymentType } from "@prisma/client";

export type LedgerEntry = {
  type: PaymentType;
  amountXaf: number;
  reverses?: { type: PaymentType; amountXaf: number } | null;
};

function baseCustomerContribution(type: PaymentType, amountXaf: number) {
  if (
    type === PaymentType.PAYMENT_RECEIVED ||
    type === PaymentType.PARTIAL_PAYMENT ||
    type === PaymentType.COURIER_COLLECTION
  ) {
    return amountXaf;
  }
  if (type === PaymentType.REFUND) return -amountXaf;
  return 0;
}

function baseCourierBalanceContribution(type: PaymentType, amountXaf: number) {
  if (type === PaymentType.COURIER_COLLECTION) return amountXaf;
  if (type === PaymentType.SETTLEMENT) return -amountXaf;
  return 0;
}

export function customerPaymentContribution(entry: LedgerEntry) {
  if (entry.type === PaymentType.REVERSAL && entry.reverses) {
    return -baseCustomerContribution(entry.reverses.type, entry.reverses.amountXaf);
  }
  return baseCustomerContribution(entry.type, entry.amountXaf);
}

export function courierBalanceContribution(entry: LedgerEntry) {
  if (entry.type === PaymentType.REVERSAL && entry.reverses) {
    return -baseCourierBalanceContribution(entry.reverses.type, entry.reverses.amountXaf);
  }
  return baseCourierBalanceContribution(entry.type, entry.amountXaf);
}

export function getOrderPaymentSummary(
  entries: readonly LedgerEntry[],
  totalXaf: number | null,
) {
  const paidXaf = entries.reduce(
    (sum, entry) => sum + customerPaymentContribution(entry),
    0,
  );
  const netRefundXaf = entries.reduce((sum, entry) => {
    if (entry.type === PaymentType.REFUND) return sum + entry.amountXaf;
    if (
      entry.type === PaymentType.REVERSAL &&
      entry.reverses?.type === PaymentType.REFUND
    ) {
      return sum - entry.reverses.amountXaf;
    }
    return sum;
  }, 0);
  const status =
    paidXaf <= 0
      ? netRefundXaf > 0
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PENDING
      : totalXaf !== null && paidXaf >= totalXaf
        ? PaymentStatus.PAID
        : PaymentStatus.PARTIAL;
  return {
    paidXaf: Math.max(0, paidXaf),
    remainingXaf: totalXaf === null ? null : Math.max(0, totalXaf - paidXaf),
    status,
  };
}
