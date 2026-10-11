import { prisma } from "@/lib/prisma";

type PaymentMetricsRow = {
  receivedXaf: bigint;
  remainingXaf: bigint;
  courierBalanceXaf: bigint;
};

export async function getPaymentDashboardMetrics(storeId: string, since: Date) {
  const [row] = await prisma.$queryRaw<PaymentMetricsRow[]>`
    WITH payment_effects AS (
      SELECT
        payment."orderId",
        payment."createdAt",
        CASE
          WHEN payment."type"::text IN ('PAYMENT_RECEIVED', 'PARTIAL_PAYMENT', 'COURIER_COLLECTION')
            THEN payment."amountXaf"::bigint
          WHEN payment."type"::text = 'REFUND'
            THEN -payment."amountXaf"::bigint
          WHEN payment."type"::text = 'REVERSAL' AND reversed."type"::text IN ('PAYMENT_RECEIVED', 'PARTIAL_PAYMENT', 'COURIER_COLLECTION')
            THEN -reversed."amountXaf"::bigint
          WHEN payment."type"::text = 'REVERSAL' AND reversed."type"::text = 'REFUND'
            THEN reversed."amountXaf"::bigint
          ELSE 0::bigint
        END AS customer_delta,
        CASE
          WHEN payment."type"::text = 'COURIER_COLLECTION'
            THEN payment."amountXaf"::bigint
          WHEN payment."type"::text = 'SETTLEMENT'
            THEN -payment."amountXaf"::bigint
          WHEN payment."type"::text = 'REVERSAL' AND reversed."type"::text = 'COURIER_COLLECTION'
            THEN -reversed."amountXaf"::bigint
          WHEN payment."type"::text = 'REVERSAL' AND reversed."type"::text = 'SETTLEMENT'
            THEN reversed."amountXaf"::bigint
          ELSE 0::bigint
        END AS courier_delta
      FROM "Payment" payment
      LEFT JOIN "Payment" reversed ON reversed."id" = payment."reversesId"
      WHERE payment."storeId" = ${storeId}
    ),
    paid_per_order AS (
      SELECT "orderId", SUM(customer_delta) AS paid_xaf
      FROM payment_effects
      GROUP BY "orderId"
    )
    SELECT
      COALESCE(
        (SELECT SUM(customer_delta) FROM payment_effects WHERE "createdAt" >= ${since}),
        0::bigint
      ) AS "receivedXaf",
      COALESCE(
        (SELECT SUM(courier_delta) FROM payment_effects),
        0::bigint
      ) AS "courierBalanceXaf",
      COALESCE(
        (
          SELECT SUM(GREATEST(order_row."totalXaf"::bigint - COALESCE(paid_per_order.paid_xaf, 0::bigint), 0::bigint))
          FROM "Order" order_row
          LEFT JOIN paid_per_order ON paid_per_order."orderId" = order_row."id"
          WHERE order_row."storeId" = ${storeId}
            AND order_row."totalXaf" IS NOT NULL
            AND order_row."confirmationStatus" = 'CONFIRMED'
            AND order_row."processingStatus" IN ('ACCEPTED', 'PREPARING', 'COMPLETED')
        ),
        0::bigint
      ) AS "remainingXaf"
  `;

  return {
    receivedXaf: safeAmount(row.receivedXaf),
    remainingXaf: safeAmount(row.remainingXaf),
    courierBalanceXaf: safeAmount(row.courierBalanceXaf),
  };
}

function safeAmount(amount: bigint) {
  const value = Number(amount);
  if (!Number.isSafeInteger(value)) {
    throw new RangeError("Le total dépasse la capacité d’affichage sécurisée.");
  }
  return value;
}
