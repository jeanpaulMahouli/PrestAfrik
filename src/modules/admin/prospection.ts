import "server-only";

import { activeUserDays, assistanceCriteria, prospectionMessages } from "@/config/prospection";
import { prisma } from "@/lib/prisma";
import { buildWaMeUrl, formatWhatsappNumber } from "@/modules/whatsapp/wa-me";

// Onglet Prospection : tous les utilisateurs (du plus récent au plus ancien), filtres combinables,
// recherche, et contact WhatsApp. Le téléphone et la ville sont ceux de la première boutique du compte
// (l'inscription ne les demande pas).

export const prospectionFilters = ["actifs", "non-publiee", "assistance"] as const;
export type ProspectionFilter = (typeof prospectionFilters)[number];
export const prospectionFilterLabels: Record<ProspectionFilter, string> = {
  actifs: "Utilisateurs actifs (30 jours)",
  "non-publiee": "Boutique non publiée",
  assistance: "Besoin d’assistance",
};
export const prospectionPageSize = 25;

const day = 86_400_000;
const countryNames = new Intl.DisplayNames(["fr"], { type: "region" });

export function parseProspectionFilters(value: string | string[] | undefined): ProspectionFilter[] {
  const values = Array.isArray(value) ? value : value ? value.split(",") : [];
  return prospectionFilters.filter((filter) => values.includes(filter));
}

export type Prospect = Awaited<ReturnType<typeof listProspects>>["rows"][number];

export async function listProspects({ filters = [], query = "", now = new Date() }: { filters?: ProspectionFilter[]; query?: string; now?: Date }) {
  const since = new Date(now.getTime() - activeUserDays * day);
  const [users, sessions] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        suspendedAt: true,
        createdAt: true,
        lastActiveAt: true,
        memberships: {
          orderBy: { createdAt: "asc" },
          select: {
            role: true,
            store: {
              select: {
                id: true,
                name: true,
                city: true,
                country: true,
                phoneE164: true,
                logoUrl: true,
                isPublished: true,
                publishedAt: true,
                pickupEnabled: true,
                whatsappSettings: { select: { businessNumber: true } },
                _count: { select: { products: { where: { status: "ACTIVE" } }, deliveryZones: { where: { isActive: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.session.groupBy({ by: ["userId"], _max: { updatedAt: true } }),
  ]);
  const lastSession = new Map(sessions.map((row) => [row.userId, row._max.updatedAt]));

  const rows = users.map((user) => {
    const owned = user.memberships.filter((membership) => membership.role === "OWNER").map((membership) => membership.store);
    const first = user.memberships[0]?.store ?? null;
    const lastActivity = [user.lastActiveAt, lastSession.get(user.id) ?? null].filter((date): date is Date => Boolean(date)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const phone = first?.phoneE164 ?? first?.whatsappSettings?.businessNumber ?? null;
    const missing = owned.flatMap((store) => {
      const gaps = assistanceCriteria
        .filter((criterion) =>
          criterion.isMissing({
            name: store.name,
            activeProducts: store._count.products,
            hasLogo: Boolean(store.logoUrl),
            hasWhatsapp: Boolean(store.whatsappSettings?.businessNumber || store.phoneE164),
            deliveryZones: store._count.deliveryZones,
            pickupEnabled: store.pickupEnabled,
          }),
        )
        .map((criterion) => criterion.missing);
      return gaps.length ? [`${store.name} : ${gaps.join(", ")}`] : [];
    });
    const unpublished = owned.filter((store) => !store.publishedAt && !store.isPublished);
    return {
      id: user.id,
      name: user.name,
      firstName: user.name.trim().split(/\s+/)[0] || user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      suspended: Boolean(user.suspendedAt),
      createdAt: user.createdAt,
      lastActivity,
      active: Boolean(lastActivity && lastActivity >= since),
      storeCount: user.memberships.length,
      storeName: (unpublished[0] ?? owned[0] ?? first)?.name ?? null,
      city: first?.city ?? null,
      country: first?.country ? (countryNames.of(first.country) ?? first.country) : null,
      phone: phone ? formatWhatsappNumber(phone) : null,
      phoneDigits: phone ? phone.replace(/\D/g, "") : null,
      unpublished: unpublished.length > 0,
      missing,
    };
  });

  const search = query.trim().toLocaleLowerCase("fr-FR");
  const searchDigits = search.replace(/\D/g, "");
  const filtered = rows.filter((row) => {
    if (filters.includes("actifs") && !row.active) return false;
    if (filters.includes("non-publiee") && !row.unpublished) return false;
    if (filters.includes("assistance") && row.missing.length === 0) return false;
    if (!search) return true;
    return (
      row.name.toLocaleLowerCase("fr-FR").includes(search) ||
      row.email.toLowerCase().includes(search) ||
      (row.city?.toLocaleLowerCase("fr-FR").includes(search) ?? false) ||
      (searchDigits.length >= 3 && (row.phoneDigits?.includes(searchDigits) ?? false))
    );
  });
  return { rows: filtered, total: filtered.length };
}

/** Statut affiché (badge) d'un prospect. */
export function prospectStatus(row: Pick<Prospect, "suspended" | "emailVerified" | "active">) {
  if (row.suspended) return { label: "Suspendu", tone: "danger" as const };
  if (!row.emailVerified) return { label: "E-mail non confirmé", tone: "warning" as const };
  return row.active ? { label: "Actif", tone: "success" as const } : { label: "Inactif", tone: "neutral" as const };
}

/** Lien wa.me avec un message adapté au filtre actif (le plus spécifique). */
export function prospectWhatsappUrl(row: Pick<Prospect, "phoneDigits" | "firstName" | "storeName">, filters: ProspectionFilter[]) {
  if (!row.phoneDigits) return null;
  const key = filters.includes("assistance") ? "assistance" : filters.includes("non-publiee") ? "non-publiee" : filters.includes("actifs") ? "actifs" : "default";
  const message = prospectionMessages[key].replace("[prenom]", row.firstName).replace("[boutique]", row.storeName ? `« ${row.storeName} »` : "");
  return buildWaMeUrl(row.phoneDigits, message.replace(/\s{2,}/g, " "));
}
