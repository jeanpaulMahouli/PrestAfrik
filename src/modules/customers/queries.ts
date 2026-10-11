import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const customerSegments = [
  "all",
  "new",
  "regular",
  "unconfirmed",
  "inactive",
  "to-recontact",
] as const;

export type CustomerSegment = (typeof customerSegments)[number];

export type CustomerListFilters = {
  query?: string;
  segment?: CustomerSegment;
  tag?: string;
  categoryId?: string;
  city?: string;
  marketingConsent?: "accepted" | "not-accepted";
  page?: number;
  take?: number;
};

type CustomerListRow = {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  firstOrderAt: Date | null;
  lastOrderAt: Date | null;
  orderCount: bigint;
  nonCancelledOrderCount: bigint;
  orderedXaf: bigint;
  receivedXaf: bigint;
  marketingConsent: boolean;
  followUpConsent: boolean;
  hasUnconfirmedOrder: boolean;
  tags: string[];
  nextReminderAt: Date | null;
  nameConflict: boolean;
  totalCount: bigint;
};

export type CustomerListItem = Omit<
  CustomerListRow,
  | "orderCount"
  | "nonCancelledOrderCount"
  | "orderedXaf"
  | "receivedXaf"
  | "totalCount"
> & {
  orderCount: number;
  nonCancelledOrderCount: number;
  orderedXaf: number;
  receivedXaf: number;
};

export async function listStoreCustomers(storeId: string, filters: CustomerListFilters = {}) {
  const now = new Date();
  const newSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const inactiveSince = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const conditions: Prisma.Sql[] = [Prisma.sql`customer."storeId" = ${storeId}`];

  if (filters.query) {
    const search = `%${filters.query}%`;
    conditions.push(
      Prisma.sql`(customer."name" ILIKE ${search} OR customer."whatsapp" LIKE ${search})`,
    );
  }
  if (filters.segment === "new") {
    conditions.push(Prisma.sql`customer."firstOrderAt" >= ${newSince}`);
  } else if (filters.segment === "regular") {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "Order" regular_order
      WHERE regular_order."customerId" = customer."id"
        AND regular_order."storeId" = customer."storeId"
        AND regular_order."processingStatus" <> 'CANCELLED'
      GROUP BY regular_order."customerId"
      HAVING COUNT(*) >= 3
    )`);
  } else if (filters.segment === "unconfirmed") {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "Order" pending_order
      WHERE pending_order."customerId" = customer."id"
        AND pending_order."storeId" = customer."storeId"
        AND pending_order."confirmationStatus" IN ('PENDING', 'CHANGE_REQUESTED')
    )`);
  } else if (filters.segment === "inactive") {
    conditions.push(
      Prisma.sql`(customer."lastOrderAt" IS NULL OR customer."lastOrderAt" <= ${inactiveSince})`,
    );
  } else if (filters.segment === "to-recontact") {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "CustomerReminder" reminder
      WHERE reminder."customerId" = customer."id"
        AND reminder."storeId" = customer."storeId"
        AND reminder."completedAt" IS NULL
        AND reminder."remindAt" <= ${now}
    )`);
  }
  if (filters.tag) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "CustomerTag" selected_tag
      WHERE selected_tag."customerId" = customer."id"
        AND selected_tag."name" = ${filters.tag}
    )`);
  }
  if (filters.categoryId) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM "Order" category_order
      JOIN "OrderItem" category_item ON category_item."orderId" = category_order."id"
      JOIN "Product" category_product
        ON category_product."id" = category_item."productId"
        AND category_product."storeId" = customer."storeId"
      WHERE category_order."customerId" = customer."id"
        AND category_order."storeId" = customer."storeId"
        AND category_product."categoryId" = ${filters.categoryId}
    )`);
  }
  if (filters.city) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "CustomerAddress" selected_address
      WHERE selected_address."customerId" = customer."id"
        AND selected_address."city" ILIKE ${filters.city}
    )`);
  }
  if (filters.marketingConsent) {
    const consentExpected = filters.marketingConsent === "accepted";
    conditions.push(Prisma.sql`COALESCE((
      SELECT latest_consent."granted" AND latest_consent."revokedAt" IS NULL
      FROM "CustomerConsent" latest_consent
      WHERE latest_consent."customerId" = customer."id"
        AND latest_consent."storeId" = customer."storeId"
        AND latest_consent."type" = 'MARKETING'
      ORDER BY latest_consent."recordedAt" DESC, latest_consent."id" DESC
      LIMIT 1
    ), false) = ${consentExpected}`);
  }

  const page = Math.max(1, Math.min(1000, filters.page ?? 1));
  const take = Math.max(1, Math.min(10_000, filters.take ?? 25));
  const rows = await prisma.$queryRaw<CustomerListRow[]>`
    SELECT
      customer."id",
      customer."name",
      customer."whatsapp",
      customer."email",
      customer."firstOrderAt",
      customer."lastOrderAt",
      customer."nameConflict",
      customer_metrics.order_count AS "orderCount",
      customer_metrics.non_cancelled_order_count AS "nonCancelledOrderCount",
      customer_metrics.ordered_xaf AS "orderedXaf",
      payment_metrics.received_xaf AS "receivedXaf",
      COALESCE(marketing."granted" AND marketing."revokedAt" IS NULL, false) AS "marketingConsent",
      COALESCE(follow_up."granted" AND follow_up."revokedAt" IS NULL, false) AS "followUpConsent",
      EXISTS (
        SELECT 1 FROM "Order" pending_order
        WHERE pending_order."customerId" = customer."id"
          AND pending_order."storeId" = customer."storeId"
          AND pending_order."confirmationStatus" IN ('PENDING', 'CHANGE_REQUESTED')
      ) AS "hasUnconfirmedOrder",
      COALESCE(customer_tags.tags, ARRAY[]::text[]) AS tags,
      reminder."remindAt" AS "nextReminderAt",
      COUNT(*) OVER () AS "totalCount"
    FROM "Customer" customer
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::bigint AS order_count,
        COUNT(*) FILTER (WHERE order_row."processingStatus" <> 'CANCELLED')::bigint AS non_cancelled_order_count,
        COALESCE(
          SUM(order_row."totalXaf") FILTER (
            WHERE order_row."processingStatus" <> 'CANCELLED' AND order_row."totalXaf" IS NOT NULL
          ),
          0
        )::bigint AS ordered_xaf
      FROM "Order" order_row
      WHERE order_row."customerId" = customer."id"
        AND order_row."storeId" = customer."storeId"
    ) customer_metrics ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(
        CASE
          WHEN payment."type"::text IN ('PAYMENT_RECEIVED', 'PARTIAL_PAYMENT', 'COURIER_COLLECTION')
            THEN payment."amountXaf"::bigint
          WHEN payment."type"::text = 'REFUND'
            THEN -payment."amountXaf"::bigint
          WHEN payment."type"::text = 'REVERSAL'
            AND reversed."type"::text IN ('PAYMENT_RECEIVED', 'PARTIAL_PAYMENT', 'COURIER_COLLECTION')
            THEN -reversed."amountXaf"::bigint
          WHEN payment."type"::text = 'REVERSAL' AND reversed."type"::text = 'REFUND'
            THEN reversed."amountXaf"::bigint
          ELSE 0::bigint
        END
      ), 0)::bigint AS received_xaf
      FROM "Order" payment_order
      JOIN "Payment" payment ON payment."orderId" = payment_order."id"
      LEFT JOIN "Payment" reversed ON reversed."id" = payment."reversesId"
      WHERE payment_order."customerId" = customer."id"
        AND payment_order."storeId" = customer."storeId"
        AND payment."storeId" = customer."storeId"
    ) payment_metrics ON true
    LEFT JOIN LATERAL (
      SELECT "granted", "revokedAt"
      FROM "CustomerConsent"
      WHERE "customerId" = customer."id"
        AND "storeId" = customer."storeId"
        AND "type" = 'MARKETING'
      ORDER BY "recordedAt" DESC, "id" DESC
      LIMIT 1
    ) marketing ON true
    LEFT JOIN LATERAL (
      SELECT "granted", "revokedAt"
      FROM "CustomerConsent"
      WHERE "customerId" = customer."id"
        AND "storeId" = customer."storeId"
        AND "type" = 'ORDER_FOLLOW_UP'
      ORDER BY "recordedAt" DESC, "id" DESC
      LIMIT 1
    ) follow_up ON true
    LEFT JOIN LATERAL (
      SELECT ARRAY_AGG("name" ORDER BY "name") AS tags
      FROM "CustomerTag"
      WHERE "customerId" = customer."id"
    ) customer_tags ON true
    LEFT JOIN LATERAL (
      SELECT "remindAt"
      FROM "CustomerReminder"
      WHERE "customerId" = customer."id"
        AND "storeId" = customer."storeId"
        AND "completedAt" IS NULL
      ORDER BY "remindAt" ASC
      LIMIT 1
    ) reminder ON true
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY customer."lastOrderAt" DESC NULLS LAST, customer."name" ASC
    LIMIT ${take}
    OFFSET ${(page - 1) * take}
  `;

  const totalCount = safeCount(rows[0]?.totalCount ?? BigInt(0));
  return {
    customers: rows.map((row) => ({
      id: row.id,
      name: row.name,
      whatsapp: row.whatsapp,
      email: row.email,
      firstOrderAt: row.firstOrderAt,
      lastOrderAt: row.lastOrderAt,
      orderCount: safeCount(row.orderCount),
      nonCancelledOrderCount: safeCount(row.nonCancelledOrderCount),
      orderedXaf: safeCount(row.orderedXaf),
      receivedXaf: safeCount(row.receivedXaf),
      marketingConsent: row.marketingConsent,
      followUpConsent: row.followUpConsent,
      hasUnconfirmedOrder: row.hasUnconfirmedOrder,
      tags: row.tags,
      nextReminderAt: row.nextReminderAt,
      nameConflict: row.nameConflict,
    })),
    totalCount,
    page,
    pageCount: Math.max(1, Math.ceil(totalCount / take)),
  };
}

function safeCount(value: bigint) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new RangeError("Le total client dépasse la capacité d’affichage sécurisée.");
  }
  return number;
}
