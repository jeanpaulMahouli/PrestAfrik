import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Publics d'un envoi manuel (Administration → Notifications) : à qui envoyer une nouveauté ou une astuce.

export const audiences = {
  tous: { label: "Tous les vendeurs", help: "Toutes les personnes qui ont une boutique." },
  actifs: { label: "Vendeurs actifs", help: "Connectés ces 7 derniers jours." },
  inactifs: { label: "Vendeurs inactifs", help: "Pas de connexion depuis 7 jours." },
  "non-publiees": { label: "Boutiques pas encore en ligne", help: "Propriétaires d’une boutique non publiée." },
  "sans-commande": { label: "Boutiques sans commande", help: "Boutique en ligne, aucune commande reçue." },
} as const;
export type Audience = keyof typeof audiences;
export const audienceKeys = Object.keys(audiences) as Audience[];

const day = 86_400_000;

export function audienceWhere(audience: Audience, now = new Date()): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { suspendedAt: null, memberships: { some: {} } };
  const weekAgo = new Date(now.getTime() - 7 * day);
  switch (audience) {
    case "actifs":
      return { ...base, lastActiveAt: { gte: weekAgo } };
    case "inactifs":
      return { ...base, OR: [{ lastActiveAt: { lt: weekAgo } }, { lastActiveAt: null }] };
    case "non-publiees":
      return { ...base, memberships: { some: { role: "OWNER", store: { isPublished: false } } } };
    case "sans-commande":
      return { ...base, memberships: { some: { store: { isPublished: true, orders: { none: {} } } } } };
    default:
      return base;
  }
}

/** Nombre de personnes visées par chaque public (et, parmi elles, celles qui reçoivent les push). */
export async function audienceSizes() {
  const entries = await Promise.all(
    audienceKeys.map(async (key) => {
      const where = audienceWhere(key);
      const [people, push] = await Promise.all([prisma.user.count({ where }), prisma.user.count({ where: { ...where, pushSubscriptions: { some: {} } } })]);
      return [key, { people, push }] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<Audience, { people: number; push: number }>;
}
