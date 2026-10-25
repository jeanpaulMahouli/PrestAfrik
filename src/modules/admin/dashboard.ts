import "server-only";

import { dayColumn } from "@/lib/dashboard-periods";
import { prisma } from "@/lib/prisma";

// Tableau de bord de l'administration. L'inscription ne demande pas de ville : la ville d'un utilisateur
// est celle de sa première boutique (renseignée dans l'assistant de création).

const day = 86_400_000;
export const topCitiesCount = 15;

export async function getAdminDashboard(now = new Date()) {
  const since30 = new Date(now.getTime() - 30 * day);
  const since7 = new Date(now.getTime() - 7 * day);

  const [stores, publishedStores, users, newUsers, memberships, sessions, events, products, visits] = await Promise.all([
    prisma.store.count(),
    prisma.store.count({ where: { isPublished: true, suspendedAt: null } }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since7 } } }),
    prisma.storeMembership.findMany({
      orderBy: { createdAt: "asc" },
      select: { userId: true, role: true, store: { select: { id: true, name: true, city: true } } },
    }),
    prisma.session.groupBy({ by: ["userId"], where: { createdAt: { gte: since30 } }, _count: { _all: true }, _max: { updatedAt: true } }),
    prisma.orderEvent.groupBy({ by: ["actorId"], where: { createdAt: { gte: since30 }, actorId: { not: null } }, _count: { _all: true } }),
    prisma.product.groupBy({ by: ["storeId"], where: { createdAt: { gte: since30 } }, _count: { _all: true } }),
    prisma.storeVisitDay.groupBy({ by: ["storeId"], where: { day: { gte: dayColumn(since30) } }, _sum: { visits: true } }),
  ]);

  // Première boutique de chaque utilisateur (ville, nom).
  const firstStore = new Map<string, { id: string; name: string; city: string | null }>();
  const ownedStores = new Map<string, string[]>();
  for (const membership of memberships) {
    if (!firstStore.has(membership.userId)) firstStore.set(membership.userId, membership.store);
    if (membership.role === "OWNER") ownedStores.set(membership.userId, [...(ownedStores.get(membership.userId) ?? []), membership.store.id]);
  }

  // Utilisateurs par ville : les 15 premières, le reste dans « Autres ».
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  const cityCounts = new Map<string, number>();
  for (const user of allUsers) {
    const city = firstStore.get(user.id)?.city?.trim() || "Ville non renseignée";
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }
  const sortedCities = [...cityCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  const cities = sortedCities.slice(0, topCitiesCount).map(([city, count]) => ({ city, count }));
  const others = sortedCities.slice(topCitiesCount).reduce((total, [, count]) => total + count, 0);
  if (others) cities.push({ city: "Autres", count: others });

  // Utilisateurs les plus actifs sur 30 jours : connexions + produits ajoutés dans leurs boutiques + commandes traitées.
  const productsByStore = new Map(products.map((row) => [row.storeId, row._count._all]));
  const activity = new Map<string, { logins: number; products: number; orders: number; lastSeen: Date | null }>();
  const entry = (userId: string) => activity.get(userId) ?? { logins: 0, products: 0, orders: 0, lastSeen: null };
  for (const row of sessions) activity.set(row.userId, { ...entry(row.userId), logins: row._count._all, lastSeen: row._max.updatedAt });
  for (const row of events) if (row.actorId) activity.set(row.actorId, { ...entry(row.actorId), orders: row._count._all });
  for (const [userId, storeIds] of ownedStores) {
    const added = storeIds.reduce((total, storeId) => total + (productsByStore.get(storeId) ?? 0), 0);
    if (added) activity.set(userId, { ...entry(userId), products: added });
  }
  const ranked = [...activity.entries()]
    .map(([userId, value]) => ({ userId, ...value, score: value.logins + value.products + value.orders }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  const activeUsers = await prisma.user.findMany({ where: { id: { in: ranked.map((row) => row.userId) } }, select: { id: true, name: true, email: true, lastActiveAt: true } });
  const userById = new Map(activeUsers.map((user) => [user.id, user]));
  const topUsers = ranked.flatMap((row) => {
    const user = userById.get(row.userId);
    if (!user) return [];
    const store = firstStore.get(row.userId);
    const lastActivity = [user.lastActiveAt, row.lastSeen].filter((date): date is Date => Boolean(date)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    return [{ ...row, name: user.name, email: user.email, storeName: store?.name ?? null, city: store?.city ?? null, lastActivity }];
  });

  // Boutiques les plus visitées sur 30 jours.
  const visitRanking = visits
    .map((row) => ({ storeId: row.storeId, visits: row._sum.visits ?? 0 }))
    .filter((row) => row.visits > 0)
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10);
  const visitedStores = await prisma.store.findMany({
    where: { id: { in: visitRanking.map((row) => row.storeId) } },
    select: { id: true, name: true, slug: true, memberships: { where: { role: "OWNER" }, take: 1, orderBy: { createdAt: "asc" }, select: { user: { select: { name: true } } } } },
  });
  const storeById = new Map(visitedStores.map((store) => [store.id, store]));
  const topStores = visitRanking.flatMap((row) => {
    const store = storeById.get(row.storeId);
    return store ? [{ id: store.id, name: store.name, slug: store.slug, owner: store.memberships[0]?.user.name ?? null, visits: row.visits }] : [];
  });

  return { kpis: { stores, publishedStores, users, newUsers }, cities, topUsers, topStores };
}
