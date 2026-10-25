import { describe, expect, it } from "vitest";
import { dayColumn, evolution, fillBuckets, periodBuckets, resolveDashboardPeriod } from "@/lib/dashboard-periods";

// 25 octobre 2026, 10 h à Douala (9 h UTC).
const now = new Date("2026-10-25T09:00:00.000Z");

describe("périodes du tableau de bord", () => {
  it("couvre 7 jours jusqu’à aujourd’hui inclus, heure de Douala, et la période précédente", () => {
    const period = resolveDashboardPeriod("7j", now);
    expect(period.from.toISOString()).toBe("2026-10-18T23:00:00.000Z");
    expect(period.to.toISOString()).toBe("2026-10-25T23:00:00.000Z");
    expect(period.previousFrom.toISOString()).toBe("2026-10-11T23:00:00.000Z");
    expect(period.bucket).toBe("day");
    expect(periodBuckets(period).map((bucket) => bucket.label)).toEqual([
      "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25",
    ]);
  });

  it("regroupe 3 mois par semaine et revient à 7 jours pour une valeur inconnue", () => {
    expect(periodBuckets(resolveDashboardPeriod("3m", now))).toHaveLength(13);
    expect(resolveDashboardPeriod("1an", now).key).toBe("7j");
    expect(resolveDashboardPeriod(undefined, now).days).toBe(7);
  });

  it("range chaque valeur dans son jour de Douala", () => {
    const period = resolveDashboardPeriod("7j", now);
    const buckets = fillBuckets(period, [
      { at: new Date("2026-10-24T23:30:00.000Z"), value: 2 }, // 25 octobre, 0 h 30 à Douala
      { at: new Date("2026-10-24T22:30:00.000Z"), value: 1 }, // 24 octobre, 23 h 30 à Douala
      { at: new Date("2026-10-01T10:00:00.000Z"), value: 9 }, // hors période
    ]);
    expect(buckets.at(-1)?.value).toBe(2);
    expect(buckets.at(-2)?.value).toBe(1);
    expect(buckets.reduce((total, bucket) => total + bucket.value, 0)).toBe(3);
  });

  it("calcule l’évolution et la colonne « jour »", () => {
    expect(evolution(12, 10)).toBe(20);
    expect(evolution(5, 10)).toBe(-50);
    expect(evolution(0, 0)).toBe(0);
    expect(evolution(3, 0)).toBeNull();
    expect(dayColumn(new Date("2026-10-24T23:30:00.000Z")).toISOString()).toBe("2026-10-25T00:00:00.000Z");
  });
});
