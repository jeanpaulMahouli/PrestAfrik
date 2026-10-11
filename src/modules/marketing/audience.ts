import { Prisma } from "@prisma/client";

export const marketingAudiences = ["all", "new", "regular", "inactive"] as const;

export type MarketingAudience = (typeof marketingAudiences)[number];

export const marketingAudienceLabels: Record<MarketingAudience, string> = {
  all: "Tous les clients autorisés",
  new: "Nouveaux clients",
  regular: "Clients réguliers",
  inactive: "Clients inactifs",
};

export function isMarketingAudience(value: string): value is MarketingAudience {
  return marketingAudiences.some((audience) => audience === value);
}

export function marketingAudienceCondition(
  audience: MarketingAudience,
  now: Date,
): Prisma.Sql {
  if (audience === "new") {
    const newSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return Prisma.sql`customer."firstOrderAt" >= ${newSince}`;
  }
  if (audience === "regular") {
    return Prisma.sql`EXISTS (
      SELECT 1 FROM "Order" regular_order
      WHERE regular_order."customerId" = customer."id"
        AND regular_order."storeId" = customer."storeId"
        AND regular_order."processingStatus" <> 'CANCELLED'
      GROUP BY regular_order."customerId"
      HAVING COUNT(*) >= 3
    )`;
  }
  if (audience === "inactive") {
    const inactiveSince = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return Prisma.sql`(
      customer."lastOrderAt" IS NULL
      OR customer."lastOrderAt" <= ${inactiveSince}
    )`;
  }
  return Prisma.sql`TRUE`;
}

export function activeMarketingConsentCondition(): Prisma.Sql {
  return Prisma.sql`COALESCE((
    SELECT latest_consent."granted" AND latest_consent."revokedAt" IS NULL
    FROM "CustomerConsent" latest_consent
    WHERE latest_consent."customerId" = customer."id"
      AND latest_consent."storeId" = customer."storeId"
      AND latest_consent."type" = 'MARKETING'
    ORDER BY latest_consent."recordedAt" DESC, latest_consent."id" DESC
    LIMIT 1
  ), false)`;
}
