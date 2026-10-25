import { startOfDoualaDay } from "@/lib/periods";

// Périodes du tableau de bord : 7 jours, 30 jours ou 3 mois glissants, jusqu'à aujourd'hui inclus
// (heure de Douala), comparés à la période précédente de même durée.

export const dashboardPeriodKeys = ["7j", "30j", "3m"] as const;
export type DashboardPeriodKey = (typeof dashboardPeriodKeys)[number];

export const dashboardPeriodLabels: Record<DashboardPeriodKey, string> = {
  "7j": "7 jours",
  "30j": "30 jours",
  "3m": "3 mois",
};

const periodDays: Record<DashboardPeriodKey, number> = { "7j": 7, "30j": 30, "3m": 90 };
const dayMs = 24 * 60 * 60 * 1000;
const offsetMs = 60 * 60 * 1000;

export type DashboardPeriod = {
  key: DashboardPeriodKey;
  days: number;
  from: Date;
  to: Date;
  previousFrom: Date;
  /** Courbes et histogrammes : un point par jour, ou par semaine sur 3 mois. */
  bucket: "day" | "week";
};

export function resolveDashboardPeriod(value: string | string[] | undefined, now = new Date()): DashboardPeriod {
  const key = dashboardPeriodKeys.includes(value as DashboardPeriodKey) ? (value as DashboardPeriodKey) : "7j";
  const days = periodDays[key];
  const to = new Date(startOfDoualaDay(now).getTime() + dayMs);
  const from = new Date(to.getTime() - days * dayMs);
  return { key, days, from, to, previousFrom: new Date(from.getTime() - days * dayMs), bucket: key === "3m" ? "week" : "day" };
}

/** Jour (AAAA-MM-JJ, heure de Douala) d'un instant. */
export function doualaDay(date: Date) {
  return new Date(date.getTime() + offsetMs).toISOString().slice(0, 10);
}

/** Valeur d’une colonne « jour » (date sans heure) : le jour de Douala contenant cet instant. */
export function dayColumn(date: Date) {
  return new Date(`${doualaDay(date)}T00:00:00.000Z`);
}

/** Début de chaque intervalle de la période (jours, ou semaines de 7 jours depuis le début). */
export function periodBuckets(period: DashboardPeriod) {
  const step = period.bucket === "week" ? 7 : 1;
  const buckets: { start: Date; label: string }[] = [];
  for (let offset = 0; offset < period.days; offset += step) {
    const start = new Date(period.from.getTime() + offset * dayMs);
    buckets.push({ start, label: doualaDay(start) });
  }
  return buckets;
}

/** Répartit des valeurs datées dans les intervalles de la période. */
export function fillBuckets(period: DashboardPeriod, rows: { at: Date; value: number }[]) {
  const buckets = periodBuckets(period);
  const totals = buckets.map(() => 0);
  const span = (period.bucket === "week" ? 7 : 1) * dayMs;
  for (const row of rows) {
    const index = Math.floor((row.at.getTime() - period.from.getTime()) / span);
    if (index >= 0 && index < totals.length) totals[index] += row.value;
  }
  return buckets.map((bucket, index) => ({ ...bucket, value: totals[index] }));
}

/** Évolution en % par rapport à la période précédente (null si rien à comparer). */
export function evolution(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}
