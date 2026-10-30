import "server-only";

import { prisma } from "@/lib/prisma";
import { storePublicUrl } from "@/lib/urls";

// Preuve sociale de l'accueil, calculée depuis la base (aucun chiffre ni logo inventé) et gardée
// 10 minutes en mémoire. Chaque compteur reste masqué tant qu'il est sous son seuil : un petit nombre
// ne rassure personne. Seuils réglables sans toucher au code (variables d'environnement).

const ttlMs = 10 * 60_000;
const threshold = (name: string, fallback: number) => Math.max(0, Number(process.env[name]) || fallback);

export const socialProofThresholds = {
  stores: threshold("SOCIAL_PROOF_MIN_STORES", 50),
  orders: threshold("SOCIAL_PROOF_MIN_ORDERS", 200),
  cities: threshold("SOCIAL_PROOF_MIN_CITIES", 5),
  /** Nombre minimal de boutiques avec logo pour afficher le bandeau « Ces boutiques vendent déjà ». */
  logos: threshold("SOCIAL_PROOF_MIN_LOGOS", 6),
};

export type ShowcaseStore = { name: string; href: string; logoUrl: string };
export type SocialProof = {
  stores: ShowcaseStore[];
  counters: { id: "stores" | "orders" | "cities"; value: number; label: string }[];
};

let cache: { at: number; value: SocialProof } | null = null;

export async function getSocialProof(): Promise<SocialProof> {
  if (cache && Date.now() - cache.at < ttlMs) return cache.value;
  const online = { isPublished: true, suspendedAt: null };
  const [withLogo, storeCount, orderCount, cities] = await Promise.all([
    prisma.store.findMany({ where: { ...online, logoUrl: { not: null } }, orderBy: { createdAt: "asc" }, take: 16, select: { name: true, slug: true, logoUrl: true } }),
    prisma.store.count({ where: online }),
    prisma.order.count(),
    prisma.store.findMany({ where: { ...online, city: { not: null } }, distinct: ["city"], select: { city: true } }),
  ]);
  const stores = withLogo.length >= socialProofThresholds.logos ? withLogo.map((store) => ({ name: store.name, href: storePublicUrl(store.slug), logoUrl: store.logoUrl! })) : [];
  const counters = [
    { id: "stores" as const, value: storeCount, label: "boutiques en ligne", min: socialProofThresholds.stores },
    { id: "orders" as const, value: orderCount, label: "commandes reçues", min: socialProofThresholds.orders },
    { id: "cities" as const, value: cities.length, label: "villes", min: socialProofThresholds.cities },
  ]
    .filter((counter) => counter.value >= counter.min && counter.value > 0)
    .map(({ id, value, label }) => ({ id, value, label }));
  const value = { stores, counters };
  cache = { at: Date.now(), value };
  return value;
}
