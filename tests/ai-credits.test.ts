import { describe, expect, it } from "vitest";
import { aiCreditBalance, monthStart, nextCreditSource, nextMonthStart } from "../src/modules/ai-credits/rules";

describe("crédits IA", () => {
  it("donne 5 crédits par mois par défaut, puis les bonus", () => {
    expect(aiCreditBalance({ monthlyAllowance: null, usedThisMonth: 2, bonus: 0 })).toEqual({ allowance: 5, monthly: 3, bonus: 0, total: 3 });
    expect(nextCreditSource({ monthlyAllowance: null, usedThisMonth: 4, bonus: 3 })).toBe("MONTHLY");
    expect(nextCreditSource({ monthlyAllowance: null, usedThisMonth: 5, bonus: 3 })).toBe("BONUS");
    expect(nextCreditSource({ monthlyAllowance: null, usedThisMonth: 5, bonus: 0 })).toBeNull();
  });

  it("respecte le réglage de l'administration (0 coupe les crédits du mois)", () => {
    expect(aiCreditBalance({ monthlyAllowance: 20, usedThisMonth: 5, bonus: 2 }).total).toBe(17);
    expect(nextCreditSource({ monthlyAllowance: 0, usedThisMonth: 0, bonus: 0 })).toBeNull();
    expect(aiCreditBalance({ monthlyAllowance: 3, usedThisMonth: 8, bonus: 1 }).monthly).toBe(0);
  });

  it("renouvelle les crédits au 1er du mois, heure de Douala", () => {
    // 31 octobre, 23 h 30 à Douala = 22 h 30 UTC : encore en octobre.
    expect(monthStart(new Date("2026-10-31T22:30:00Z")).toISOString()).toBe("2026-09-30T23:00:00.000Z");
    // 1er novembre, 0 h 30 à Douala = 31 octobre 23 h 30 UTC : déjà novembre.
    expect(monthStart(new Date("2026-10-31T23:30:00Z")).toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(nextMonthStart(new Date("2026-11-13T10:00:00Z")).toISOString()).toBe("2026-11-30T23:00:00.000Z");
  });
});
