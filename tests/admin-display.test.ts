import { describe, expect, it } from "vitest";
import { classifyFailure, storeStateDisplay, subscriptionDisplay } from "../src/modules/admin/display";

const now = new Date("2026-10-22T10:00:00.000Z");
const plan = { name: "Business" };

describe("admin failure reasons", () => {
  it("classifies WhatsApp errors without exposing their text", () => {
    expect(classifyFailure("(#190) Error validating access token: Session has expired")).toBe("token");
    expect(classifyFailure("Template name does not exist in the translation (132001)")).toBe("template");
    expect(classifyFailure("Recipient phone number not in allowed list (131030)")).toBe("number");
    expect(classifyFailure("Consentement au suivi absent")).toBe("other");
    expect(classifyFailure(null)).toBe("other");
  });
});

describe("admin subscription display", () => {
  it("shows remaining trial days", () => {
    const state = subscriptionDisplay({ status: "TRIAL", trialEndsAt: new Date("2026-10-31T10:00:00.000Z"), currentPeriodEnd: null, plan }, now);
    expect(state).toMatchObject({ label: "Essai", group: "trial", offer: "Essai (9 j)" });
  });

  it("marks finished trials and lapsed paid periods as expired", () => {
    expect(subscriptionDisplay({ status: "TRIAL", trialEndsAt: new Date("2026-10-01T00:00:00.000Z"), currentPeriodEnd: null, plan }, now).label).toBe("Essai expiré");
    expect(subscriptionDisplay({ status: "ACTIVE", trialEndsAt: now, currentPeriodEnd: new Date("2026-10-01T00:00:00.000Z"), plan }, now).group).toBe("expired");
  });

  it("shows active paid subscriptions with their plan", () => {
    expect(subscriptionDisplay({ status: "ACTIVE", trialEndsAt: now, currentPeriodEnd: new Date("2026-11-01T00:00:00.000Z"), plan }, now)).toMatchObject({ label: "Actif", offer: "Business" });
  });

  it("puts suspension before every other store state", () => {
    expect(storeStateDisplay({ isPublished: true, suspendedAt: now }, false).label).toBe("Suspendue");
    expect(storeStateDisplay({ isPublished: true, suspendedAt: null }, true).label).toBe("Mise en pause");
    expect(storeStateDisplay({ isPublished: false, suspendedAt: null }, false).label).toBe("Brouillon");
  });
});
