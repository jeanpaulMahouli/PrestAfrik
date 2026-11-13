import "server-only";

import { prisma } from "@/lib/prisma";
import { aiCreditBalance, monthStart, nextCreditSource, nextMonthStart } from "@/modules/ai-credits/rules";

// Crédits de l'assistant IA d'une boutique (règles : modules/ai-credits/rules.ts).

export type AiCredits = ReturnType<typeof aiCreditBalance> & { renewsAt: Date };

/** Crédits restants de la boutique (ce mois-ci et bonus) et date de renouvellement. */
export async function getAiCredits(storeId: string, now = new Date()): Promise<AiCredits> {
  const [store, usedThisMonth] = await Promise.all([
    prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { aiMonthlyCredits: true, aiBonusCredits: true } }),
    prisma.aiCreditUse.count({ where: { storeId, source: "MONTHLY", createdAt: { gte: monthStart(now) } } }),
  ]);
  return { ...aiCreditBalance({ monthlyAllowance: store.aiMonthlyCredits, usedThisMonth, bonus: store.aiBonusCredits }), renewsAt: nextMonthStart(now) };
}

export type AiCreditTicket = { id: string; source: "MONTHLY" | "BONUS" };

/**
 * Prend 1 crédit avant d'appeler l'IA (crédits du mois d'abord, puis bonus), ou renvoie null quand il
 * n'en reste plus. Un verrou par boutique évite qu'un double clic ne compte deux fois le même crédit.
 */
export async function takeAiCredit(storeId: string, userId: string | null, now = new Date()): Promise<AiCreditTicket | null> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ai-credits:${storeId}`}))`;
    const [store, usedThisMonth] = await Promise.all([
      tx.store.findUniqueOrThrow({ where: { id: storeId }, select: { aiMonthlyCredits: true, aiBonusCredits: true } }),
      tx.aiCreditUse.count({ where: { storeId, source: "MONTHLY", createdAt: { gte: monthStart(now) } } }),
    ]);
    const source = nextCreditSource({ monthlyAllowance: store.aiMonthlyCredits, usedThisMonth, bonus: store.aiBonusCredits });
    if (!source) return null;
    if (source === "BONUS") await tx.store.update({ where: { id: storeId }, data: { aiBonusCredits: { decrement: 1 } } });
    const use = await tx.aiCreditUse.create({ data: { storeId, userId, source }, select: { id: true, source: true } });
    return use;
  });
}

/** Rend le crédit quand l'IA n'a pas pu répondre (le vendeur ne paie que les réponses reçues). */
export async function refundAiCredit(storeId: string, ticket: AiCreditTicket) {
  await prisma.$transaction(async (tx) => {
    const removed = await tx.aiCreditUse.deleteMany({ where: { id: ticket.id, storeId } });
    if (removed.count && ticket.source === "BONUS") await tx.store.update({ where: { id: storeId }, data: { aiBonusCredits: { increment: 1 } } });
  });
}
