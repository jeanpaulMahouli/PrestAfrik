import { describe, expect, it } from "vitest";
import {
  activeMarketingConsentCondition,
  marketingAudienceCondition,
} from "../src/modules/marketing/audience";
import { marketingCampaignSchema } from "../src/modules/marketing/validation";

describe("marketing campaign validation", () => {
  it("accepts supported consent-safe audiences and a bounded recipient limit", () => {
    expect(
      marketingCampaignSchema.safeParse({
        name: "Nouveautés de la boutique",
        audience: "regular",
        message: "Découvre nos nouveautés.",
        recipientLimit: "250",
      }).success,
    ).toBe(true);
  });

  it("rejects unsupported audiences, blank messages, and excessive limits", () => {
    expect(
      marketingCampaignSchema.safeParse({
        name: "Campagne",
        audience: "unsubscribed",
        message: " ",
        recipientLimit: "10001",
      }).success,
    ).toBe(false);
  });
});

describe("marketing campaign audience selection", () => {
  it("always bases eligibility on the latest marketing consent, including revocation", () => {
    const sql = activeMarketingConsentCondition().sql;
    expect(sql).toContain('"granted"');
    expect(sql).toContain('"revokedAt" IS NULL');
    expect(sql).toContain('ORDER BY latest_consent."recordedAt" DESC, latest_consent."id" DESC');
    expect(sql).toContain("LIMIT 1");
  });

  it("uses the configured customer segment conditions", () => {
    const now = new Date("2026-10-11T00:00:00Z");
    expect(marketingAudienceCondition("new", now).sql).toContain('"firstOrderAt"');
    expect(marketingAudienceCondition("regular", now).sql).toContain("HAVING COUNT(*) >= 3");
    expect(marketingAudienceCondition("inactive", now).sql).toContain('"lastOrderAt"');
    expect(marketingAudienceCondition("all", now).sql).toBe("TRUE");
  });
});
