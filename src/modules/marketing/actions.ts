"use server";

import { MarketingCampaignStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isMarketingAudience } from "@/modules/marketing/audience";
import { selectEligibleCampaignRecipients } from "@/modules/marketing/queries";
import { getCampaignSender, sendPendingCampaignMessages, type CampaignSender } from "@/modules/marketing/sender";
import { campaignIdSchema, marketingCampaignSchema } from "@/modules/marketing/validation";
import { requireStorePermission } from "@/modules/stores/context";
import {
  assertCanCreateCampaign,
  getSubscriptionAccessForTransaction,
  getMonthlyMessageUsageForTransaction,
  lockSubscriptionForUpdate,
  SubscriptionLimitError,
} from "@/modules/subscriptions/service";

const marketingPath = "/dashboard/marketing/campagnes";

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
    reportError("Vérifiez le nom, le message, l’audience et la limite (de 1 à 10 000 destinataires).");
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

/**
 * Envoi d'une campagne par WhatsApp (Cloud API). 1) Les destinataires consentants sont choisis et comptés
 * dans le quota (transaction courte) ; 2) les messages partent ensuite, hors transaction.
 * Sans API WhatsApp configurée, rien n'est envoyé et le vendeur sait pourquoi.
 */
export async function sendMarketingCampaign(formData: FormData) {
  const campaignId = campaignIdSchema.safeParse(formData.get("campaignId"));
  if (!campaignId.success) reportError("Campagne invalide.");
  // Confirmation explicite obligatoire avant tout envoi (brief §6.11).
  if (formData.get("confirm") !== "on") reportError("Cochez la case de confirmation avant d’envoyer la campagne.");

  const { store } = await requireStorePermission("marketing.manage");
  const sender = await getCampaignSender(store.id);
  if (!sender.ok) reportError(sender.reason);

  let selected: number | null;
  try {
    selected = await prisma.$transaction(async (transaction) => {
      await lockSubscriptionForUpdate(transaction, store.id);
      const now = new Date();
      const access = await getSubscriptionAccessForTransaction(transaction, store.id, now);
      if (access.featureRestricted) {
        throw new SubscriptionLimitError(
          "EXPIRED_FEATURE",
          "La période d’essai est expirée depuis au moins 7 jours. Choisissez une offre pour envoyer une campagne.",
        );
      }
      const monthlyUsed = await getMonthlyMessageUsageForTransaction(transaction, store.id, now);
      const remainingQuota = Math.max(0, access.plan.monthlyMessageQuota - monthlyUsed);
      if (remainingQuota === 0) {
        throw new SubscriptionLimitError("MESSAGE_QUOTA", "Le quota mensuel de messages est atteint. Choisissez une offre supérieure.");
      }
      const claimed = await transaction.marketingCampaign.updateMany({
        where: { id: campaignId.data, storeId: store.id, status: MarketingCampaignStatus.DRAFT },
        data: { status: MarketingCampaignStatus.PROCESSING },
      });
      if (claimed.count !== 1) return null;

      const campaign = await transaction.marketingCampaign.findFirst({
        where: { id: campaignId.data, storeId: store.id },
        select: { audience: true, recipientLimit: true },
      });
      if (!campaign) throw new Error("La campagne est introuvable après le début de l’envoi.");
      if (!isMarketingAudience(campaign.audience)) throw new Error("L’audience enregistrée pour cette campagne n’est pas reconnue.");

      const recipients = await selectEligibleCampaignRecipients(transaction, store.id, campaign.audience, Math.min(campaign.recipientLimit, remainingQuota), now);
      if (recipients.length) {
        await transaction.marketingCampaignRecipient.createMany({
          data: recipients.map((recipient) => ({ campaignId: campaignId.data, customerId: recipient.id, whatsapp: recipient.whatsapp, simulatedAt: now })),
        });
      } else {
        await transaction.marketingCampaign.update({ where: { id: campaignId.data }, data: { status: MarketingCampaignStatus.SENT, sentAt: now } });
      }
      return recipients.length;
    });
  } catch (error) {
    if (error instanceof SubscriptionLimitError) reportError(error.message);
    throw error;
  }

  if (selected === null) reportError("Cette campagne n’est plus en brouillon ou n’existe pas dans votre boutique.");
  if (selected === 0) reportError("Aucun client de cette audience n’a accepté de recevoir vos offres : rien n’a été envoyé.");
  await finishSending(store.id, campaignId.data, sender);
}

/** Reprend l'envoi d'une campagne commencée (gros envois, ou envoi interrompu par une erreur WhatsApp). */
export async function continueMarketingCampaign(formData: FormData) {
  const campaignId = campaignIdSchema.safeParse(formData.get("campaignId"));
  if (!campaignId.success) reportError("Campagne invalide.");
  const { store } = await requireStorePermission("marketing.manage");
  const campaign = await prisma.marketingCampaign.findFirst({ where: { id: campaignId.data, storeId: store.id, status: MarketingCampaignStatus.PROCESSING }, select: { id: true } });
  if (!campaign) reportError("Cette campagne n’est pas en cours d’envoi.");
  const sender = await getCampaignSender(store.id);
  if (!sender.ok) reportError(sender.reason);
  await finishSending(store.id, campaign.id, sender);
}

async function finishSending(storeId: string, campaignId: string, sender: Extract<CampaignSender, { ok: true }>): Promise<never> {
  const result = await sendPendingCampaignMessages(storeId, campaignId, sender);
  revalidatePath(marketingPath);
  const query = new URLSearchParams({ envoyes: String(result.sent), echecs: String(result.failed), restants: String(result.remaining) });
  if (result.stopError) query.set("erreur", `Envoi interrompu : ${result.stopError} Les messages restants partiront avec « Continuer l’envoi ».`);
  redirect(`${marketingPath}?${query.toString()}`);
}
