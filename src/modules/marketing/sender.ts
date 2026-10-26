import "server-only";

import { MarketingCampaignStatus, MarketingDeliveryStatus, WhatsappApiStatus, WhatsappMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secret-box";
import { sendTemplateMessage } from "@/modules/whatsapp/cloud-api";

/** Phrase de désinscription ajoutée à chaque message de campagne (brief §6.11). */
export const unsubscribeNotice = "Pour ne plus recevoir nos offres, répondez STOP.";

export const whatsappApiSettingsPath = "/dashboard/boutique/whatsapp/api";

export type CampaignSender =
  | { ok: true; phoneNumberId: string; accessToken: string; templateName: string; language: string }
  | { ok: false; reason: string };

/**
 * Les campagnes partent par l'API WhatsApp Business (Cloud API) : sans elle, impossible d'envoyer un
 * message à des clients qui n'ont pas écrit en premier. Retourne la raison, en clair, si ce n'est pas prêt.
 */
export async function getCampaignSender(storeId: string): Promise<CampaignSender> {
  const settings = await prisma.whatsappSettings.findUnique({ where: { storeId } });
  const configure = "Configurez-la dans Ma boutique, rubrique Messages WhatsApp, onglet API WhatsApp.";
  if (!settings || !settings.apiPhoneNumberId || !settings.apiAccessTokenEncrypted) {
    return {
      ok: false,
      reason: `L’API WhatsApp n’est pas configurée : vos campagnes ne peuvent pas être envoyées. ${configure} Il faut un compte WhatsApp Business (Meta), l’identifiant du numéro, un jeton d’accès et un modèle de message approuvé.`,
    };
  }
  if (settings.apiStatus === WhatsappApiStatus.FAILED) {
    return {
      ok: false,
      reason: `La connexion à l’API WhatsApp a échoué${settings.apiLastError ? ` (${settings.apiLastError.replace(/\.$/, "")})` : ""} : vos campagnes ne peuvent pas être envoyées. Corrigez vos réglages, puis touchez « Tester la connexion ».`,
    };
  }
  if (settings.mode !== WhatsappMode.CLOUD_API || settings.apiStatus !== WhatsappApiStatus.CONNECTED) {
    return {
      ok: false,
      reason: `L’API WhatsApp est enregistrée mais pas encore activée : vos campagnes ne peuvent pas être envoyées. ${configure} Touchez « Tester la connexion » puis activez l’API.`,
    };
  }
  if (!settings.apiTemplateName) {
    return {
      ok: false,
      reason:
        "Aucun modèle de message n’est indiqué : WhatsApp n’autorise l’envoi de campagnes qu’avec un modèle approuvé par Meta (avec une variable {{1}}). Indiquez son nom dans Ma boutique, rubrique Messages WhatsApp, onglet API WhatsApp.",
    };
  }
  let accessToken: string;
  try {
    accessToken = decryptSecret(settings.apiAccessTokenEncrypted);
  } catch {
    return { ok: false, reason: `Le jeton d’accès WhatsApp enregistré est illisible. Saisissez-le de nouveau. ${configure}` };
  }
  return { ok: true, phoneNumberId: settings.apiPhoneNumberId, accessToken, templateName: settings.apiTemplateName, language: settings.apiTemplateLanguage || "fr" };
}

/** Temps maximal passé à envoyer pendant une requête : au-delà, l'envoi reprend avec « Continuer l'envoi ». */
const sendBudgetMs = 40_000;
const concurrency = 8;

/**
 * Envoie les messages encore « à envoyer » d'une campagne, par petits paquets en parallèle, dans la limite
 * de temps d'une requête. Retourne ce qui a été fait ; la campagne passe à « Envoyée » quand tout est traité.
 */
export async function sendPendingCampaignMessages(storeId: string, campaignId: string, sender: Extract<CampaignSender, { ok: true }>) {
  const campaign = await prisma.marketingCampaign.findFirst({ where: { id: campaignId, storeId }, select: { message: true } });
  if (!campaign) return { sent: 0, failed: 0, remaining: 0, stopError: null as string | null };
  const bodyText = `${campaign.message.trim()} ${unsubscribeNotice}`;
  const started = Date.now();
  let sent = 0;
  let failed = 0;
  let stopError: string | null = null;

  while (Date.now() - started < sendBudgetMs && !stopError) {
    const batch = await prisma.marketingCampaignRecipient.findMany({
      where: { campaignId, status: MarketingDeliveryStatus.PENDING },
      select: { id: true, whatsapp: true },
      take: concurrency,
    });
    if (!batch.length) break;
    const results = await Promise.all(
      batch.map((recipient) =>
        sendTemplateMessage({ ...sender, to: recipient.whatsapp, bodyText }).then((result) => ({ recipient, result })),
      ),
    );
    for (const { recipient, result } of results) {
      if (result.ok) {
        sent += 1;
        await prisma.marketingCampaignRecipient.update({
          where: { id: recipient.id },
          data: { status: MarketingDeliveryStatus.SENT, sentAt: new Date(), waMessageId: result.messageId, error: null },
        });
      } else if (result.fatal) {
        // Problème de compte, de jeton ou de modèle : inutile de continuer, le destinataire reste « à envoyer ».
        stopError = result.error;
      } else {
        failed += 1;
        await prisma.marketingCampaignRecipient.update({
          where: { id: recipient.id },
          data: { status: MarketingDeliveryStatus.FAILED, error: result.error.slice(0, 300) },
        });
      }
    }
  }

  const [remaining, totals] = await Promise.all([
    prisma.marketingCampaignRecipient.count({ where: { campaignId, status: MarketingDeliveryStatus.PENDING } }),
    prisma.marketingCampaignRecipient.groupBy({ by: ["status"], where: { campaignId }, _count: { _all: true } }),
  ]);
  const count = (status: MarketingDeliveryStatus) => totals.find((row) => row.status === status)?._count._all ?? 0;
  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: {
      sentCount: count(MarketingDeliveryStatus.SENT),
      failedCount: count(MarketingDeliveryStatus.FAILED),
      ...(remaining === 0 ? { status: MarketingCampaignStatus.SENT, sentAt: new Date() } : {}),
    },
  });
  return { sent, failed, remaining, stopError };
}
