import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { aiCreditBalance, monthStart } from "@/modules/ai-credits/rules";

// Administration → Crédits IA : consommation de chaque boutique et totaux du mois.

export type AiCreditFilter = "all" | "used" | "empty" | "custom";
export const aiCreditFilters: AiCreditFilter[] = ["all", "used", "empty", "custom"];

export async function listAiCreditStores(filter: AiCreditFilter, query: string, now = new Date()) {
  const since = monthStart(now);
  const where: Prisma.StoreWhereInput = {
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
            { memberships: { some: { role: "OWNER", user: { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] } } } },
          ],
        }
      : {}),
    ...(filter === "custom" ? { OR: [{ aiMonthlyCredits: { not: null } }, { aiBonusCredits: { gt: 0 } }] } : {}),
    ...(filter === "used" || filter === "empty" ? { aiCreditUses: { some: { createdAt: { gte: since } } } } : {}),
  };
  const stores = await prisma.store.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      name: true,
      slug: true,
      aiMonthlyCredits: true,
      aiBonusCredits: true,
      memberships: { where: { role: "OWNER" }, take: 1, select: { user: { select: { name: true, email: true } } } },
    },
  });
  const ids = stores.map((store) => store.id);
  const [monthly, all] = await Promise.all([
    prisma.aiCreditUse.groupBy({ by: ["storeId", "source"], where: { storeId: { in: ids }, createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.aiCreditUse.groupBy({ by: ["storeId"], where: { storeId: { in: ids } }, _count: { _all: true } }),
  ]);
  const usedMonthly = new Map<string, number>();
  const usedThisMonth = new Map<string, number>();
  for (const row of monthly) {
    usedThisMonth.set(row.storeId, (usedThisMonth.get(row.storeId) ?? 0) + row._count._all);
    if (row.source === "MONTHLY") usedMonthly.set(row.storeId, row._count._all);
  }
  const allTime = new Map(all.map((row) => [row.storeId, row._count._all]));
  const rows = stores.map((store) => {
    const balance = aiCreditBalance({ monthlyAllowance: store.aiMonthlyCredits, usedThisMonth: usedMonthly.get(store.id) ?? 0, bonus: store.aiBonusCredits });
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      owner: store.memberships[0]?.user ?? null,
      customMonthly: store.aiMonthlyCredits !== null,
      balance,
      usedThisMonth: usedThisMonth.get(store.id) ?? 0,
      usedAllTime: allTime.get(store.id) ?? 0,
    };
  });
  return filter === "empty" ? rows.filter((row) => row.balance.total === 0) : rows;
}

/** Totaux du mois : demandes, boutiques qui ont utilisé l'IA, crédits bonus donnés. */
export async function getAiCreditStats(now = new Date()) {
  const since = monthStart(now);
  const [requests, stores, granted, outstanding] = await Promise.all([
    prisma.aiCreditUse.count({ where: { createdAt: { gte: since } } }),
    prisma.aiCreditUse.groupBy({ by: ["storeId"], where: { createdAt: { gte: since } } }),
    prisma.aiCreditGrant.aggregate({ where: { createdAt: { gte: since }, amount: { gt: 0 } }, _sum: { amount: true } }),
    prisma.store.aggregate({ _sum: { aiBonusCredits: true } }),
  ]);
  return { requests, activeStores: stores.length, grantedThisMonth: granted._sum.amount ?? 0, bonusOutstanding: outstanding._sum.aiBonusCredits ?? 0 };
}

/** Derniers crédits donnés ou retirés (historique affiché sous le tableau). */
export function listRecentAiGrants() {
  return prisma.aiCreditGrant.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { id: true, amount: true, reason: true, createdAt: true, store: { select: { name: true } } },
  });
}
