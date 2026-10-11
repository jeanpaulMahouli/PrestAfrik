import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  activeMarketingConsentCondition,
  marketingAudienceCondition,
  type MarketingAudience,
} from "@/modules/marketing/audience";

type CampaignRecipientCandidate = {
  id: string;
  whatsapp: string;
};

export async function countEligibleCampaignRecipients(
  storeId: string,
  audience: MarketingAudience = "all",
) {
  const now = new Date();
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS "count"
    FROM "Customer" customer
    WHERE customer."storeId" = ${storeId}
      AND ${activeMarketingConsentCondition()}
      AND ${marketingAudienceCondition(audience, now)}
  `;
  const count = Number(rows[0]?.count ?? BigInt(0));
  if (!Number.isSafeInteger(count)) {
    throw new RangeError("Le nombre de destinataires dépasse la capacité d’affichage sécurisée.");
  }
  return count;
}

export async function selectEligibleCampaignRecipients(
  transaction: Prisma.TransactionClient,
  storeId: string,
  audience: MarketingAudience,
  recipientLimit: number,
  now: Date,
) {
  return transaction.$queryRaw<CampaignRecipientCandidate[]>`
    SELECT customer."id", customer."whatsapp"
    FROM "Customer" customer
    WHERE customer."storeId" = ${storeId}
      AND ${activeMarketingConsentCondition()}
      AND ${marketingAudienceCondition(audience, now)}
    ORDER BY customer."createdAt" ASC, customer."id" ASC
    LIMIT ${recipientLimit}
  `;
}
