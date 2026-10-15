"use server";

import { MarketingCampaignStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isMarketingAudience } from "@/modules/marketing/audience";
import { selectEligibleCampaignRecipients } from "@/modules/marketing/queries";
import { campaignIdSchema, marketingCampaignSchema } from "@/modules/marketing/validation";
import { requireStorePermission } from "@/modules/stores/context";
import {
  assertCanCreateCampaign,
  getSubscriptionAccessForTransaction,
  getMonthlyMessageUsageForTransaction,
  lockSubscriptionForUpdate,
  SubscriptionLimitError,
} from "@/modules/subscriptions/service";

const marketingPath = "/dashboard/marketing";

function reportError(message: string): never {
  redirect(`${marketingPath}?erreur=${encodeURIComponent(message)}`);
}

export async function createMarketingCampaign(formData: FormData) {
  const parsed = marketingCampaignSchema.safeParse({
    name: formData.get("name"),
    audience: formData.get("audience"),
    message: formData.get("message"),
    recipientLimit: formData.get("recipientLimit"),
  });
  if (!parsed.success) {
    reportError("Vérifie le nom, le message, l’audience et la limite (de 1 à 10 000 destinataires).");
  }

  const { session, store } = await requireStorePermission("marketing.manage");
  try {
    await assertCanCreateCampaign(store.id);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) reportError(error.message);
    throw error;
  }
  await prisma.marketingCampaign.create({
    data: {
      storeId: store.id,
      createdById: session.user.id,
      ...parsed.data,
    },
  });
  revalidatePath(marketingPath);
  redirect(`${marketingPath}?succes=brouillon`);
}

export async function simulateMarketingCampaign(formData: FormData) {
  const campaignId = campaignIdSchema.safeParse(formData.get("campaignId"));
  if (!campaignId.success) reportError("Campagne invalide.");
  // Confirmation explicite obligatoire avant tout envoi (brief §6.11).
  if (formData.get("confirm") !== "on") reportError("Cochez la case de confirmation avant d’envoyer la campagne.");

  const { store } = await requireStorePermission("marketing.manage");
  let result: number | null;
  try {
    result = await prisma.$transaction(async (transaction) => {
      await lockSubscriptionForUpdate(transaction, store.id);
      const now = new Date();
      const access = await getSubscriptionAccessForTransaction(transaction, store.id, now);
      if (access.featureRestricted) {
        throw new SubscriptionLimitError(
          "EXPIRED_FEATURE",
          "La période d’essai est expirée depuis au moins 7 jours. Choisis une offre pour simuler une campagne.",
        );
      }
      const monthlyUsed = await getMonthlyMessageUsageForTransaction(transaction, store.id, now);
      const remainingQuota = Math.max(0, access.plan.monthlyMessageQuota - monthlyUsed);
      if (remainingQuota === 0) {
        throw new SubscriptionLimitError(
          "MESSAGE_QUOTA",
          "Le quota mensuel de messages est atteint. Choisis une offre supérieure.",
        );
      }
      const claimed = await transaction.marketingCampaign.updateMany({
        where: {
          id: campaignId.data,
          storeId: store.id,
          status: MarketingCampaignStatus.DRAFT,
        },
        data: { status: MarketingCampaignStatus.PROCESSING },
      });
      if (claimed.count !== 1) return null;

      const campaign = await transaction.marketingCampaign.findFirst({
        where: { id: campaignId.data, storeId: store.id },
        select: { audience: true, recipientLimit: true },
      });
      if (!campaign) {
        throw new Error("La campagne est introuvable après son passage en simulation.");
      }
      if (!isMarketingAudience(campaign.audience)) {
        throw new Error("L’audience enregistrée pour cette campagne n’est pas reconnue.");
      }

      const recipients = await selectEligibleCampaignRecipients(
        transaction,
        store.id,
        campaign.audience,
        Math.min(campaign.recipientLimit, remainingQuota),
        now,
      );
      if (recipients.length) {
        await transaction.marketingCampaignRecipient.createMany({
          data: recipients.map((recipient) => ({
            campaignId: campaignId.data,
            customerId: recipient.id,
            whatsapp: recipient.whatsapp,
            simulatedAt: now,
          })),
        });
      }
      await transaction.marketingCampaign.update({
        where: { id: campaignId.data },
        data: { status: MarketingCampaignStatus.SIMULATED, simulatedAt: now },
      });
      return recipients.length;
    });
  } catch (error) {
    if (error instanceof SubscriptionLimitError) reportError(error.message);
    throw error;
  }

  if (result === null) {
    reportError("Cette campagne n’est plus en brouillon ou n’existe pas dans ta boutique.");
  }
  revalidatePath(marketingPath);
  redirect(`${marketingPath}?simule=${result}`);
}
