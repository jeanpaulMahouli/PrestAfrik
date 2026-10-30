import "server-only";

import { prisma } from "@/lib/prisma";

// Preuve sociale de l'accueil, calculée depuis la base (aucun chiffre ni logo inventé) et gardée
// 10 minutes en mémoire. Chaque compteur reste masqué tant qu'il est sous son seuil : un petit nombre
// ne rassure personne. Seuils réglables sans toucher au code (variables d'environnement).

const ttlMs = 10 * 60_000;
const threshold = (name: string, fallback: number) => Math.max(0, Number(process.env[name]) || fallback);

export const socialProofThresholds = {
  stores: threshold("SOCIAL_PROOF_MIN_STORES", 50),
  orders: threshold("SOCIAL_PROOF_MIN_ORDERS", 200),
};

export type SocialProof = {
  counters: { id: "stores" | "orders"; value: number; label: string }[];
};

let cache: { at: number; value: SocialProof } | null = null;

export async function getSocialProof(): Promise<SocialProof> {
  if (cache && Date.now() - cache.at < ttlMs) return cache.value;
  const online = { isPublished: true, suspendedAt: null };
  const [storeCount, orderCount] = await Promise.all([prisma.store.count({ where: online }), prisma.order.count()]);
  const counters = [
    { id: "stores" as const, value: storeCount, label: "boutiques en ligne", min: socialProofThresholds.stores },
    { id: "orders" as const, value: orderCount, label: "commandes reçues", min: socialProofThresholds.orders },
  ]
    .filter((counter) => counter.value >= counter.min && counter.value > 0)
    .map(({ id, value, label }) => ({ id, value, label }));
  const value = { counters };
  cache = { at: Date.now(), value };
  return value;
}
