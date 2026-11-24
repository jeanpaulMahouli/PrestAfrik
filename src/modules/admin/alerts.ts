import "server-only";

import { prisma } from "@/lib/prisma";
import { buildWaMeUrl } from "@/modules/whatsapp/wa-me";

// Onglet Alertes de l'administration, calculées à partir des données : suspicions de spam, clients sans
// réponse (commandes en attente depuis plus de 48 h) et e-mails non confirmés. Les demandes d'aide sont dans
// la Messagerie ; les messages WhatsApp échoués ont leur propre page.

export type AlertKind = "email" | "spam" | "orders";
export type AdminAlert = {
  /** Clé stable : une même situation garde la même clé (traitée ou ignorée une seule fois). */
  key: string;
  kind: AlertKind;
  title: string;
  body: string;
  /** Compte concerné (e-mail non vérifié). */
  userId?: string;
  /** Boutique concernée (spam), pour « Contacter » et « Suspendre ». */
  store?: { id: string; name: string; slug: string; suspended: boolean; contactUrl: string | null };
};

export const alertKindLabels: Record<AlertKind, string> = { email: "E-mail non vérifié", spam: "Suspicion de spam", orders: "Clients sans réponse" };

/** Clients sans réponse : au moins 3 commandes non traitées depuis plus de 48 h (sur les 30 derniers jours). */
export const waitingOrdersThreshold = { count: 3, hours: 48 };
/** Au-delà de 14 jours, un e-mail non confirmé est un compte abandonné : plus d'alerte. */
const unverifiedMaxDays = 14;

const hour = 3_600_000;
const day = 24 * hour;
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/** Seuils de suspicion de spam (sur les dernières 24 heures). */
export const spamThresholds = {
  /** Produits créés en 24 h par une même boutique. */
  productsPerDay: 50,
  /** Produits portant exactement le même nom dans une boutique. */
  duplicateNames: 10,
  /** Descriptions de produits contenant un lien externe. */
  productsWithLinks: 3,
};
const linkPattern = /(https?:\/\/|www\.|bit\.ly|tinyurl|t\.me\/|wa\.me\/)/i;

export async function computeAlerts(now = new Date()): Promise<AdminAlert[]> {
  const alerts: AdminAlert[] = [];
  const [unverified, recentProducts, duplicates, waiting] = await Promise.all([
    // Adresses non confirmées depuis plus d'une heure (le temps de recevoir l'e-mail), et depuis moins de 14 jours.
    prisma.user.findMany({
      where: { emailVerified: false, phoneNumberVerified: false, suspendedAt: null, createdAt: { lt: new Date(now.getTime() - hour), gte: new Date(now.getTime() - unverifiedMaxDays * day) } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.product.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - day) } },
      select: { storeId: true, description: true },
      take: 20_000,
    }),
    prisma.product.groupBy({ by: ["storeId", "name"], where: { status: { not: "ARCHIVED" } }, _count: { _all: true }, having: { name: { _count: { gte: spamThresholds.duplicateNames } } } }),
    prisma.order.groupBy({
      by: ["storeId"],
      where: { processingStatus: "TO_REVIEW", createdAt: { lt: new Date(now.getTime() - waitingOrdersThreshold.hours * hour), gte: new Date(now.getTime() - 30 * day) } },
      _count: { _all: true },
      having: { storeId: { _count: { gte: waitingOrdersThreshold.count } } },
    }),
  ]);

  for (const user of unverified) {
    alerts.push({
      key: `email-unverified:${user.id}`,
      kind: "email",
      title: `${user.name} n’a pas confirmé son adresse e-mail`,
      body: `${user.email}, inscrit le ${user.createdAt.toLocaleDateString("fr-FR", { timeZone: "Africa/Douala" })}. Sans confirmation, sa boutique ne peut pas être publiée.`,
      userId: user.id,
    });
  }

  const suspicions = new Map<string, string[]>();
  const add = (storeId: string, reason: string) => suspicions.set(storeId, [...(suspicions.get(storeId) ?? []), reason]);
  const perStore = new Map<string, { count: number; links: number }>();
  for (const product of recentProducts) {
    const entry = perStore.get(product.storeId) ?? { count: 0, links: 0 };
    entry.count += 1;
    if (product.description && linkPattern.test(product.description)) entry.links += 1;
    perStore.set(product.storeId, entry);
  }
  for (const [storeId, entry] of perStore) {
    if (entry.count >= spamThresholds.productsPerDay) add(storeId, `${entry.count} produits créés en 24 h`);
    if (entry.links >= spamThresholds.productsWithLinks) add(storeId, `${entry.links} descriptions avec des liens externes`);
  }
  for (const row of duplicates) add(row.storeId, `${row._count._all} produits nommés « ${row.name} »`);

  if (suspicions.size) {
    const stores = await prisma.store.findMany({
      where: { id: { in: [...suspicions.keys()] } },
      select: {
        id: true,
        name: true,
        slug: true,
        suspendedAt: true,
        phoneE164: true,
        memberships: { where: { role: "OWNER" }, take: 1, select: { user: { select: { name: true, email: true } } } },
      },
    });
    for (const store of stores) {
      const reasons = suspicions.get(store.id) ?? [];
      const owner = store.memberships[0]?.user;
      const greeting = `Bonjour${owner ? ` ${owner.name.split(/\s+/)[0]}` : ""}, c’est l’équipe PrestAfrik. Nous avons remarqué une activité inhabituelle sur votre boutique « ${store.name} ». Pouvez-vous nous en dire plus ?`;
      alerts.push({
        key: `spam:${store.id}:${dayKey(now)}`,
        kind: "spam",
        title: `Activité inhabituelle : ${store.name}`,
        body: reasons.join(" · "),
        store: {
          id: store.id,
          name: store.name,
          slug: store.slug,
          suspended: Boolean(store.suspendedAt),
          contactUrl: store.phoneE164 ? buildWaMeUrl(store.phoneE164, greeting) : owner ? `mailto:${owner.email}?subject=${encodeURIComponent("Votre boutique PrestAfrik")}&body=${encodeURIComponent(greeting)}` : null,
        },
      });
    }
  }

  if (waiting.length) {
    const stores = await prisma.store.findMany({
      where: { id: { in: waiting.map((row) => row.storeId) }, suspendedAt: null },
      select: { id: true, name: true, slug: true, phoneE164: true, memberships: { where: { role: "OWNER" }, take: 1, select: { user: { select: { name: true } } } } },
    });
    for (const store of stores) {
      const count = waiting.find((row) => row.storeId === store.id)?._count._all ?? 0;
      const owner = store.memberships[0]?.user;
      const greeting = `Bonjour${owner ? ` ${owner.name.split(/\s+/)[0]}` : ""}, c’est l’équipe PrestAfrik. ${count} clients attendent votre réponse sur « ${store.name} ». Besoin d’aide pour les traiter ?`;
      alerts.push({
        key: `orders:${store.id}:${dayKey(now)}`,
        kind: "orders",
        title: `Clients sans réponse : ${store.name}`,
        body: `${count} commandes attendent depuis plus de ${waitingOrdersThreshold.hours} h. Le vendeur a été prévenu dans son application.`,
        store: { id: store.id, name: store.name, slug: store.slug, suspended: false, contactUrl: store.phoneE164 ? buildWaMeUrl(store.phoneE164, greeting) : null },
      });
    }
  }

  // Le plus urgent d'abord : spam, puis clients sans réponse, puis e-mails.
  const rank: Record<AlertKind, number> = { spam: 0, orders: 1, email: 2 };
  return alerts.sort((a, b) => rank[a.kind] - rank[b.kind]);
}

/** Alertes nouvelles : celles qui n'ont été ni traitées ni ignorées. */
export async function listOpenAlerts(now = new Date()) {
  const alerts = await computeAlerts(now);
  if (!alerts.length) return [];
  const decided = await prisma.adminAlertState.findMany({ where: { key: { in: alerts.map((alert) => alert.key) } }, select: { key: true } });
  const closed = new Set(decided.map((state) => state.key));
  return alerts.filter((alert) => !closed.has(alert.key));
}

/** Pastille du menu « Alertes » : exactement les alertes nouvelles de la page (les messages sont dans la Messagerie). */
export async function countOpenAlerts() {
  return (await listOpenAlerts()).length;
}
