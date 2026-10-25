import "server-only";

import { prisma } from "@/lib/prisma";
import { dayColumn, evolution, fillBuckets, type DashboardPeriod } from "@/lib/dashboard-periods";
import { orderStage, stageProcessingStatuses, type OrderStage } from "@/modules/orders/state-machine";

// Chiffres de la page d'accueil du vendeur (période + période précédente de même durée).
// « Argent encaissé » suit la même règle que « Argent reçu » : paiements enregistrés, moins les annulations.

type PaymentRow = { receivedAt: Date; delta: bigint };

async function paymentEffects(storeId: string, from: Date, to: Date) {
  const rows = await prisma.$queryRaw<PaymentRow[]>`
    SELECT payment."receivedAt",
      CASE
        WHEN payment."type"::text IN ('PAYMENT_RECEIVED', 'PARTIAL_PAYMENT', 'COURIER_COLLECTION') THEN payment."amountXaf"::bigint
        WHEN payment."type"::text = 'REFUND' THEN -payment."amountXaf"::bigint
        WHEN payment."type"::text = 'REVERSAL' AND reversed."type"::text IN ('PAYMENT_RECEIVED', 'PARTIAL_PAYMENT', 'COURIER_COLLECTION') THEN -reversed."amountXaf"::bigint
        WHEN payment."type"::text = 'REVERSAL' AND reversed."type"::text = 'REFUND' THEN reversed."amountXaf"::bigint
        ELSE 0::bigint
      END AS delta
    FROM "Payment" payment
    LEFT JOIN "Payment" reversed ON reversed."id" = payment."reversesId"
    WHERE payment."storeId" = ${storeId} AND payment."receivedAt" >= ${from} AND payment."receivedAt" < ${to}
  `;
  return rows.map((row) => ({ at: row.receivedAt, value: Number(row.delta) }));
}

const sum = (rows: { value: number }[]) => rows.reduce((total, row) => total + row.value, 0);

export async function getDashboardStats(storeId: string, period: DashboardPeriod) {
  const { from, to, previousFrom } = period;
  const [orders, payments, visits, pending, latestOrders, ratings] = await Promise.all([
    prisma.order.findMany({
      where: { storeId, createdAt: { gte: previousFrom, lt: to } },
      select: { createdAt: true, processingStatus: true, totalXaf: true, subtotalXaf: true },
    }),
    paymentEffects(storeId, previousFrom, to),
    prisma.storeVisitDay.findMany({ where: { storeId, day: { gte: dayColumn(previousFrom), lt: dayColumn(to) } }, select: { day: true, visits: true } }),
    prisma.order.count({ where: { storeId, processingStatus: { in: stageProcessingStatuses.NEW } } }),
    prisma.order.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, reference: true, customerName: true, totalXaf: true, subtotalXaf: true, processingStatus: true, createdAt: true },
    }),
    prisma.productReview.groupBy({
      by: ["productId"],
      where: { storeId, status: "APPROVED", product: { status: "ACTIVE" } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const inPeriod = <T extends { at: Date }>(rows: T[]) => rows.filter((row) => row.at >= from);
  const inPrevious = <T extends { at: Date }>(rows: T[]) => rows.filter((row) => row.at < from);

  const orderRows = orders.map((order) => ({ at: order.createdAt, value: 1, order }));
  const currentOrders = inPeriod(orderRows);
  const previousOrders = inPrevious(orderRows);
  // Visites : jour de Douala stocké à minuit UTC, ramené au début de journée de Douala.
  const visitRows = visits.map((row) => ({ at: new Date(row.day.getTime() - 60 * 60 * 1000), value: row.visits }));

  const basket = (rows: typeof orderRows) => {
    const valid = rows.filter((row) => row.order.processingStatus !== "CANCELLED");
    return valid.length ? Math.round(valid.reduce((total, row) => total + (row.order.totalXaf ?? row.order.subtotalXaf), 0) / valid.length) : 0;
  };

  const kpis = {
    orders: { value: currentOrders.length, evolution: evolution(currentOrders.length, previousOrders.length) },
    received: { value: sum(inPeriod(payments)), evolution: evolution(sum(inPeriod(payments)), sum(inPrevious(payments))) },
    pending: { value: pending },
    visits: { value: sum(inPeriod(visitRows)), evolution: evolution(sum(inPeriod(visitRows)), sum(inPrevious(visitRows))) },
    basket: { value: basket(currentOrders), evolution: evolution(basket(currentOrders), basket(previousOrders)) },
  };

  const stages: Record<OrderStage, number> = { NEW: 0, VALIDATED: 0, CANCELLED: 0 };
  for (const row of currentOrders) stages[orderStage(row.order.processingStatus)] += 1;

  // Mieux notés : note moyenne puis nombre d'avis.
  const ranked = ratings
    .map((row) => ({ productId: row.productId, average: row._avg.rating ?? 0, count: row._count._all }))
    .sort((a, b) => b.average - a.average || b.count - a.count)
    .slice(0, 5);
  const products = await prisma.product.findMany({
    where: { id: { in: ranked.map((row) => row.productId) } },
    select: { id: true, name: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  return {
    kpis,
    ordersSeries: fillBuckets(period, currentOrders),
    receivedSeries: fillBuckets(period, inPeriod(payments)),
    stages,
    topRated: ranked.flatMap((row) => {
      const product = byId.get(row.productId);
      return product ? [{ id: product.id, name: product.name, imageUrl: product.images[0]?.url ?? null, average: row.average, count: row.count }] : [];
    }),
    latestOrders: latestOrders.map((order) => ({ ...order, stage: orderStage(order.processingStatus), amountXaf: order.totalXaf ?? order.subtotalXaf })),
  };
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;
