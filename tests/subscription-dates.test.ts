import { describe, expect, it } from "vitest";
import {
  addCalendarPeriod,
  daysSince,
  isStoreSubscriptionPaused,
  startOfUtcMonth,
} from "../src/modules/subscriptions/dates";

describe("subscription calendar dates", () => {
  it("clamps monthly periods to the last day of shorter months", () => {
    expect(addCalendarPeriod(new Date("2026-01-31T12:00:00.000Z"), "MONTHLY"))
      .toEqual(new Date("2026-02-28T12:00:00.000Z"));
    expect(addCalendarPeriod(new Date("2024-01-31T12:00:00.000Z"), "MONTHLY"))
      .toEqual(new Date("2024-02-29T12:00:00.000Z"));
  });

  it("preserves the time and clamps yearly periods in leap years", () => {
    expect(addCalendarPeriod(new Date("2024-02-29T08:30:00.000Z"), "YEARLY"))
      .toEqual(new Date("2025-02-28T08:30:00.000Z"));
  });

  it("starts monthly usage at midnight UTC on the first day", () => {
    expect(startOfUtcMonth(new Date("2026-10-11T18:45:00.000Z")))
      .toEqual(new Date("2026-10-01T00:00:00.000Z"));
  });

  it("pauses an expired storefront at 14 full days, but not before", () => {
    const expiry = new Date("2026-10-01T12:00:00.000Z");
    const subscription = {
      status: "EXPIRED",
      trialEndsAt: expiry,
      currentPeriodEnd: null,
    };

    expect(daysSince(expiry, new Date("2026-10-15T11:59:59.999Z"))).toBe(13);
    expect(isStoreSubscriptionPaused(subscription, new Date("2026-10-15T11:59:59.999Z"))).toBe(false);
    expect(isStoreSubscriptionPaused(subscription, new Date("2026-10-15T12:00:00.000Z"))).toBe(true);
  });

  it("does not pause an active or canceled paid subscription before its period ends", () => {
    const end = new Date("2026-10-15T12:00:00.000Z");
    for (const status of ["ACTIVE", "CANCELED"]) {
      expect(
        isStoreSubscriptionPaused(
          { status, trialEndsAt: new Date("2026-09-01T00:00:00.000Z"), currentPeriodEnd: end },
          new Date("2026-10-15T11:59:59.999Z"),
        ),
      ).toBe(false);
    }
  });
});
