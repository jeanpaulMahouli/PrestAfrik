import "server-only";

import { dayColumn, evolution, fillBuckets, type DashboardPeriod } from "@/lib/dashboard-periods";
import { prisma } from "@/lib/prisma";
import { cityLabel } from "@/modules/geo";

// Administration → Statistiques : les indicateurs de performance de PrestAfrik sur une période glissante
// (7 jours, 30 jours, 3 mois), comparés à la période précédente de même durée.

type PaymentRow = { receivedAt: Date; delta: bigint };

/** Argent encaissé par les vendeurs (paiements reçus, moins remboursements et annulations), toutes boutiques. */
async function paymentEffects(from: Date, to: Date) {
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
    WHERE payment."receivedAt" >= ${from} AND payment."receivedAt" < ${to}
  `;
  return rows.map((row) => ({ at: row.receivedAt, value: Number(row.delta) }));
}

const sum = (rows: { value: number }[]) => rows.reduce((total, row) => total + row.value, 0);
const ratio = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const orderAmount = (order: { totalXaf: number | null; subtotalXaf: number }) => order.totalXaf ?? order.subtotalXaf;

export const orderStatusLabels: Record<string, string> = {
  TO_REVIEW: "À valider",
  ACCEPTED: "Acceptées",
  PREPARING: "En préparation",
  COMPLETED: "Validées",
  CANCELLED: "Annulées",
};

export async function getPlatformStatistics(period: DashboardPeriod) {
  const { from, to, previousFrom } = period;
  const inPeriod = { gte: from, lt: to };
  const inPrevious = { gte: previousFrom, lt: from };

  const [
    usersTotal,
    usersWithPhone,
    newUsers,
    previousNewUsers,
    activeSellers,
    storesTotal,
    storesPublished,
    newStores,
    previousNewStores,
    orders,
    previousOrders,
    payments,
    previousPayments,
    visits,
    previousVisits,
    productsOnline,
    newProducts,
    reviews,
    previousReviews,
    appInstalledTotal,
    appInstalledInPeriod,
    appUsage,
    previousAppUsers,
    owners,
    trials,
    paying,
    activities,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { phoneNumber: { not: null } } }),
    prisma.user.findMany({ where: { createdAt: inPeriod }, select: { createdAt: true } }),
    prisma.user.count({ where: { createdAt: inPrevious } }),
    prisma.user.count({ where: { lastActiveAt: inPeriod } }),
    prisma.store.count(),
    prisma.store.count({ where: { isPublished: true, suspendedAt: null } }),
    prisma.store.findMany({ where: { createdAt: inPeriod }, select: { createdAt: true } }),
    prisma.store.count({ where: { createdAt: inPrevious } }),
    prisma.order.findMany({
      where: { createdAt: inPeriod },
      select: { createdAt: true, storeId: true, deliveryCity: true, processingStatus: true, totalXaf: true, subtotalXaf: true },
    }),
    prisma.order.findMany({ where: { createdAt: inPrevious }, select: { processingStatus: true, totalXaf: true, subtotalXaf: true } }),
    paymentEffects(from, to),
    paymentEffects(previousFrom, from),
    prisma.storeVisitDay.groupBy({ by: ["day"], where: { day: { gte: dayColumn(from), lt: dayColumn(to) } }, _sum: { visits: true } }),
    prisma.storeVisitDay.aggregate({ where: { day: { gte: dayColumn(previousFrom), lt: dayColumn(from) } }, _sum: { visits: true } }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { createdAt: inPeriod } }),
    prisma.productReview.findMany({ where: { createdAt: inPeriod, status: "APPROVED" }, select: { rating: true } }),
    prisma.productReview.count({ where: { createdAt: inPrevious, status: "APPROVED" } }),
    prisma.user.count({ where: { appInstalledAt: { not: null } } }),
    prisma.user.count({ where: { appInstalledAt: inPeriod } }),
    prisma.appUsageDay.findMany({ where: { day: { gte: dayColumn(from), lt: dayColumn(to) } }, select: { userId: true, day: true, platform: true } }),
    prisma.appUsageDay.findMany({ where: { day: { gte: dayColumn(previousFrom), lt: dayColumn(from) } }, distinct: ["userId"], select: { userId: true } }),
    prisma.storeMembership.findMany({
      where: { role: "OWNER" },
      select: {
        userId: true,
        store: { select: { isPublished: true, _count: { select: { products: { where: { status: "ACTIVE" } }, orders: true } } } },
      },
    }),
    prisma.subscription.count({ where: { status: "TRIAL", trialEndsAt: { gt: new Date() } } }),
    prisma.subscription.count({ where: { status: "ACTIVE", currentPeriodEnd: { gt: new Date() } } }),
    prisma.store.groupBy({ by: ["activityId"], _count: { _all: true } }),
  ]);

  // ---------- Commandes ----------
  const liveOrders = orders.filter((order) => order.processingStatus !== "CANCELLED");
  const previousLive = previousOrders.filter((order) => order.processingStatus !== "CANCELLED");
  const gmv = liveOrders.reduce((total, order) => total + orderAmount(order), 0);
  const previousGmv = previousLive.reduce((total, order) => total + orderAmount(order), 0);
  const completed = orders.filter((order) => order.processingStatus === "COMPLETED").length;
  const previousCompleted = previousOrders.filter((order) => order.processingStatus === "COMPLETED").length;
  const averageBasket = liveOrders.length ? Math.round(gmv / liveOrders.length) : 0;
  const previousBasket = previousLive.length ? Math.round(previousGmv / previousLive.length) : 0;
  const collected = sum(payments);
  const previousCollected = sum(previousPayments);
  const visitTotal = visits.reduce((total, row) => total + (row._sum.visits ?? 0), 0);
  const previousVisitTotal = previousVisits._sum.visits ?? 0;
  const conversion = ratio(orders.length, visitTotal);
  const previousConversion = ratio(previousOrders.length, previousVisitTotal);
  const storesWithOrders = new Set(orders.map((order) => order.storeId)).size;

  // ---------- Entonnoir d'activation (comptes) ----------
  const funnelSets = { store: new Set<string>(), published: new Set<string>(), product: new Set<string>(), order: new Set<string>() };
  for (const owner of owners) {
    funnelSets.store.add(owner.userId);
    if (owner.store.isPublished) funnelSets.published.add(owner.userId);
    if (owner.store._count.products > 0) funnelSets.product.add(owner.userId);
    if (owner.store._count.orders > 0) funnelSets.order.add(owner.userId);
  }
  const funnel = [
    { label: "Comptes inscrits", value: usersTotal },
    { label: "Boutique créée", value: funnelSets.store.size },
    { label: "Produit en ligne", value: funnelSets.product.size },
    { label: "Boutique publiée", value: funnelSets.published.size },
    { label: "Au moins une commande", value: funnelSets.order.size },
  ].map((step) => ({ ...step, percent: ratio(step.value, usersTotal) }));

  // ---------- Application ----------
  const appUsers = new Set(appUsage.map((row) => row.userId));
  const appDaily = new Map<string, Set<string>>();
  for (const row of appUsage) {
    const key = row.day.toISOString();
    appDaily.set(key, (appDaily.get(key) ?? new Set()).add(row.userId));
  }
  const appPlatforms = new Map<string, Set<string>>();
  for (const row of appUsage) appPlatforms.set(row.platform, (appPlatforms.get(row.platform) ?? new Set()).add(row.userId));

  // ---------- Classements ----------
  const byStore = new Map<string, { orders: number; gmv: number }>();
  for (const order of liveOrders) {
    const entry = byStore.get(order.storeId) ?? { orders: 0, gmv: 0 };
    byStore.set(order.storeId, { orders: entry.orders + 1, gmv: entry.gmv + orderAmount(order) });
  }
  const topStoreIds = [...byStore.entries()].sort((a, b) => b[1].gmv - a[1].gmv || b[1].orders - a[1].orders).slice(0, 10);
  const storeNames = await prisma.store.findMany({ where: { id: { in: topStoreIds.map(([id]) => id) } }, select: { id: true, name: true, slug: true, city: true } });
  const storeById = new Map(storeNames.map((store) => [store.id, store]));
  const topStores = topStoreIds.flatMap(([id, value]) => {
    const store = storeById.get(id);
    return store ? [{ ...store, city: cityLabel(store.city), ...value }] : [];
  });

  const cityCounts = new Map<string, number>();
  for (const order of orders) {
    const city = cityLabel(order.deliveryCity);
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }
  const topCities = [...cityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));

  const statusCounts = Object.keys(orderStatusLabels).map((status) => ({
    label: orderStatusLabels[status],
    value: orders.filter((order) => order.processingStatus === status).length,
  }));

  const activityLabels = await prisma.activity.findMany({ where: { id: { in: activities.flatMap((row) => (row.activityId ? [row.activityId] : [])) } }, select: { id: true, label: true } });
  const activityById = new Map(activityLabels.map((activity) => [activity.id, activity.label]));
  const topActivities = activities
    .map((row) => ({ label: row.activityId ? (activityById.get(row.activityId) ?? "Autre") : "Non renseignée", value: row._count._all }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const ratingAverage = reviews.length ? Math.round((reviews.reduce((total, review) => total + review.rating, 0) / reviews.length) * 10) / 10 : null;

  return {
    kpis: {
      usersTotal,
      newUsers: newUsers.length,
      newUsersEvolution: evolution(newUsers.length, previousNewUsers),
      whatsappCoverage: ratio(usersWithPhone, usersTotal),
      usersWithoutPhone: usersTotal - usersWithPhone,
      activeSellers,
      storesTotal,
      storesPublished,
      publicationRate: ratio(storesPublished, storesTotal),
      newStores: newStores.length,
      newStoresEvolution: evolution(newStores.length, previousNewStores),
      storesWithOrders,
      orders: orders.length,
      ordersEvolution: evolution(orders.length, previousOrders.length),
      gmv,
      gmvEvolution: evolution(gmv, previousGmv),
      collected,
      collectedEvolution: evolution(collected, previousCollected),
      averageBasket,
      averageBasketEvolution: evolution(averageBasket, previousBasket),
      completed,
      completedEvolution: evolution(completed, previousCompleted),
      validationRate: ratio(completed, orders.length),
      cancelRate: ratio(orders.length - liveOrders.length, orders.length),
      visits: visitTotal,
      visitsEvolution: evolution(visitTotal, previousVisitTotal),
      conversion,
      conversionPrevious: previousConversion,
      productsOnline,
      newProducts,
      reviews: reviews.length,
      reviewsEvolution: evolution(reviews.length, previousReviews),
      ratingAverage,
      appInstalledTotal,
      appInstalledInPeriod,
      appActiveUsers: appUsers.size,
      appActiveEvolution: evolution(appUsers.size, previousAppUsers.length),
      appAdoption: ratio(appInstalledTotal, usersTotal),
      trials,
      paying,
    },
    series: {
      signups: fillBuckets(period, newUsers.map((user) => ({ at: user.createdAt, value: 1 }))),
      stores: fillBuckets(period, newStores.map((store) => ({ at: store.createdAt, value: 1 }))),
      orders: fillBuckets(period, orders.map((order) => ({ at: order.createdAt, value: 1 }))),
      gmv: fillBuckets(period, liveOrders.map((order) => ({ at: order.createdAt, value: orderAmount(order) }))),
      collected: fillBuckets(period, payments),
      // Colonnes « jour » : minuit UTC du jour de Douala, ramené à l'instant de début de ce jour (UTC+1).
      visits: fillBuckets(period, visits.map((row) => ({ at: new Date(row.day.getTime() - 3_600_000), value: row._sum.visits ?? 0 }))),
      appUsers: fillBuckets(period, [...appDaily.entries()].map(([day, users]) => ({ at: new Date(new Date(day).getTime() - 3_600_000), value: users.size }))),
    },
    funnel,
    statusCounts,
    topStores,
    topCities,
    topActivities,
    appPlatforms: [...appPlatforms.entries()].map(([platform, users]) => ({ label: platformLabels[platform] ?? platform, value: users.size })).sort((a, b) => b.value - a.value),
  };
}

export const platformLabels: Record<string, string> = { android: "Android", ios: "iPhone / iPad", desktop: "Ordinateur" };

/** Administration → Application : comptes qui ont installé l'application ou l'utilisent. */
export async function listAppUsers(now = new Date()) {
  const since30 = new Date(now.getTime() - 30 * 86_400_000);
  const [users, usage] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ appInstalledAt: { not: null } }, { appLastOpenedAt: { not: null } }] },
      orderBy: [{ appLastOpenedAt: { sort: "desc", nulls: "last" } }, { appInstalledAt: "desc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        appInstalledAt: true,
        appLastOpenedAt: true,
        appPlatform: true,
        memberships: { orderBy: { createdAt: "asc" }, take: 1, select: { store: { select: { name: true, slug: true } } } },
      },
    }),
    prisma.appUsageDay.groupBy({ by: ["userId"], where: { day: { gte: dayColumn(since30) } }, _count: { _all: true }, _sum: { opens: true } }),
  ]);
  const usageByUser = new Map(usage.map((row) => [row.userId, { days: row._count._all, opens: row._sum.opens ?? 0 }]));
  const rows = users.map((user) => {
    const used = usageByUser.get(user.id) ?? { days: 0, opens: 0 };
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phoneNumber,
      platform: user.appPlatform ? (platformLabels[user.appPlatform] ?? user.appPlatform) : "—",
      installedAt: user.appInstalledAt,
      lastOpenedAt: user.appLastOpenedAt,
      daysUsed30: used.days,
      opens30: used.opens,
      active: Boolean(user.appLastOpenedAt && user.appLastOpenedAt >= since30),
      store: user.memberships[0]?.store ?? null,
    };
  });
  return {
    rows,
    installed: rows.length,
    active30: rows.filter((row) => row.active).length,
    byPlatform: Object.entries(
      rows.reduce<Record<string, number>>((counts, row) => ({ ...counts, [row.platform]: (counts[row.platform] ?? 0) + 1 }), {}),
    ).sort((a, b) => b[1] - a[1]),
  };
}
