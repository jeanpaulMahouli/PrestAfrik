import "server-only";

import { prisma } from "@/lib/prisma";
import { startOfDoualaDay } from "@/lib/periods";

// Définitions du tableau de bord (brief §6.9). Toutes les valeurs viennent de la base ;
// « valeur actuelle » = indépendante de la période, « période » = bornée par [from, to[.

type OverviewRow = {
  ordersToValidate: bigint;
  validatedOrders: bigint;
  soldOutProducts: bigint;
  activeProducts: bigint;
  failedMessages: bigint;
  customersToRecontact: bigint;
  regularCustomers: bigint;
  newOrdersToday: bigint;
  receivedXaf: bigint;
  activeZones: bigint;
};

const toNumber = (value: bigint) => {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new RangeError("Valeur hors de la plage d’affichage sécurisée.");
  return result;
};

export async function getDashboardOverview(storeId: string, from: Date, to: Date, now = new Date()) {
  const todayStart = startOfDoualaDay(now);
  const [row] = await prisma.$queryRaw<OverviewRow[]>`
    WITH payment_effects AS (
      SELECT
        payment."orderId",
        payment."receivedAt",
        CASE
          WHEN payment."type"::text IN ('PAYMENT_RECEIVED', 'PARTIAL_PAYMENT', 'COURIER_COLLECTION') THEN payment."amountXaf"::bigint
          WHEN payment."type"::text = 'REFUND' THEN -payment."amountXaf"::bigint
          WHEN payment."type"::text = 'REVERSAL' AND reversed."type"::text IN ('PAYMENT_RECEIVED', 'PARTIAL_PAYMENT', 'COURIER_COLLECTION') THEN -reversed."amountXaf"::bigint
          WHEN payment."type"::text = 'REVERSAL' AND reversed."type"::text = 'REFUND' THEN reversed."amountXaf"::bigint
          ELSE 0::bigint
        END AS customer_delta
      FROM "Payment" payment
      LEFT JOIN "Payment" reversed ON reversed."id" = payment."reversesId"
      WHERE payment."storeId" = ${storeId}
    ),
    customer_orders AS (
      SELECT "customerId", COUNT(*) AS valid_orders
      FROM "Order"
      WHERE "storeId" = ${storeId} AND "processingStatus" <> 'CANCELLED'
      GROUP BY "customerId"
    )
    SELECT
      (SELECT COUNT(*) FROM "Order" WHERE "storeId" = ${storeId}
        AND "processingStatus" IN ('TO_REVIEW', 'ACCEPTED', 'PREPARING')) AS "ordersToValidate",
      (SELECT COUNT(*) FROM "Order" WHERE "storeId" = ${storeId} AND "processingStatus" = 'COMPLETED'
        AND "updatedAt" >= ${from} AND "updatedAt" < ${to}) AS "validatedOrders",
      (SELECT COUNT(*) FROM "Product" WHERE "storeId" = ${storeId} AND "status" = 'ACTIVE'
        AND ("availability" = 'SOLD_OUT' OR ("trackInventory" = true AND "stockQuantity" <= 0))) AS "soldOutProducts",
      (SELECT COUNT(*) FROM "Product" WHERE "storeId" = ${storeId} AND "status" = 'ACTIVE') AS "activeProducts",
      (SELECT COUNT(*) FROM "OutboxEvent" WHERE "storeId" = ${storeId}
        AND "processedAt" IS NULL AND "lastError" IS NOT NULL) AS "failedMessages",
      (SELECT COUNT(DISTINCT "customerId") FROM "CustomerReminder" WHERE "storeId" = ${storeId}
        AND "completedAt" IS NULL AND "remindAt" <= ${now}) AS "customersToRecontact",
      (SELECT COUNT(*) FROM customer_orders WHERE valid_orders >= 3) AS "regularCustomers",
      (SELECT COUNT(*) FROM "Order" WHERE "storeId" = ${storeId} AND "createdAt" >= ${todayStart}) AS "newOrdersToday",
      COALESCE((SELECT SUM(customer_delta) FROM payment_effects
        WHERE "receivedAt" >= ${from} AND "receivedAt" < ${to}), 0::bigint) AS "receivedXaf",
      (SELECT COUNT(*) FROM "DeliveryZone" WHERE "storeId" = ${storeId} AND "isActive" = true) AS "activeZones"
  `;

  const whatsapp = await prisma.whatsappSettings.findUnique({ where: { storeId }, select: { businessNumber: true } });

  return {
    ordersToValidate: toNumber(row.ordersToValidate),
    validatedOrders: toNumber(row.validatedOrders),
    soldOutProducts: toNumber(row.soldOutProducts),
    activeProducts: toNumber(row.activeProducts),
    failedMessages: toNumber(row.failedMessages),
    customersToRecontact: toNumber(row.customersToRecontact),
    regularCustomers: toNumber(row.regularCustomers),
    newOrdersToday: toNumber(row.newOrdersToday),
    receivedXaf: toNumber(row.receivedXaf),
    activeZones: toNumber(row.activeZones),
    whatsappConnected: Boolean(whatsapp?.businessNumber),
  };
}

export type DashboardOverview = Awaited<ReturnType<typeof getDashboardOverview>>;
