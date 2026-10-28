import "server-only";

import { parsePhoneNumberFromString } from "libphonenumber-js";
import { explainSendError, graphApiBaseUrl } from "@/modules/whatsapp/cloud-api";

// Compte WhatsApp Business officiel de PrestAfrik (et non celui d'une boutique) : envoi des codes de
// vérification à l'inscription et pour le mot de passe oublié. Configuration : docs/whatsapp-meta.md.
//
//   WHATSAPP_PLATFORM_PHONE_NUMBER_ID   identifiant du numéro expéditeur (WhatsApp Manager → API)
//   WHATSAPP_PLATFORM_ACCESS_TOKEN      jeton permanent d'un utilisateur système (secret)
//   WHATSAPP_OTP_TEMPLATE_NAME          modèle « Authentification » approuvé par Meta (défaut : prestafrik_code)
//   WHATSAPP_OTP_TEMPLATE_LANGUAGE      langue du modèle (défaut : fr)
//   WHATSAPP_DEV_LOG_CODES              « true » en développement seulement : le code s'affiche dans le terminal
//                                       au lieu d'être envoyé (jamais en production).

export type PlatformConfig = { phoneNumberId: string; accessToken: string; templateName: string; language: string };

export function platformWhatsappConfig(): PlatformConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PLATFORM_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WHATSAPP_PLATFORM_ACCESS_TOKEN?.trim();
  if (!phoneNumberId || !accessToken || !/^\d{5,30}$/.test(phoneNumberId)) return null;
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME?.trim() || "prestafrik_code";
  const language = process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE?.trim() || "fr";
  return { phoneNumberId, accessToken, templateName, language };
}

/** Mode développement : aucun envoi, le code est affiché dans le terminal du serveur. */
export function devCodeLoggingEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.WHATSAPP_DEV_LOG_CODES === "true";
}

export type OtpSendResult =
  | { ok: true; messageId: string | null }
  | { ok: false; reason: "not-configured" | "rejected" | "network"; error: string };

/** Numéro masqué pour les journaux et l'interface : +237 6•• ••• •42. */
export function maskPhone(e164: string) {
  const phone = parsePhoneNumberFromString(e164);
  if (!phone || phone.nationalNumber.length < 4) return "•••";
  return `+${phone.countryCallingCode} ${phone.nationalNumber[0]}•• ••• •${phone.nationalNumber.slice(-2)}`;
}

/**
 * Envoie un code à usage unique avec le modèle d'authentification de PrestAfrik. Meta impose, pour ce
 * type de modèle, le code en variable du texte ET du bouton « Copier le code ».
 * Les journaux ne contiennent jamais le code ni le numéro complet.
 */
export async function sendOtpMessage(to: string, code: string): Promise<OtpSendResult> {
  const config = platformWhatsappConfig();
  if (!config) {
    if (devCodeLoggingEnabled()) {
      console.info(`[whatsapp:dev] Code de vérification pour ${maskPhone(to)} : ${code} (aucun message envoyé, WHATSAPP_DEV_LOG_CODES=true)`);
      return { ok: true, messageId: null };
    }
    console.error("[whatsapp] Envoi des codes impossible : WHATSAPP_PLATFORM_PHONE_NUMBER_ID ou WHATSAPP_PLATFORM_ACCESS_TOKEN manquant.");
    return { ok: false, reason: "not-configured", error: "L’envoi des codes par WhatsApp n’est pas encore activé. Réessayez plus tard ou écrivez-nous." };
  }

  let response: Response;
  try {
    response = await fetch(`${graphApiBaseUrl()}/${encodeURIComponent(config.phoneNumberId)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: config.templateName,
          language: { code: config.language },
          components: [
            { type: "body", parameters: [{ type: "text", text: code }] },
            { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
          ],
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    console.error(`[whatsapp] Meta ne répond pas (code pour ${maskPhone(to)}).`);
    return { ok: false, reason: "network", error: "WhatsApp ne répond pas pour le moment. Vérifiez votre connexion et réessayez dans un instant." };
  }

  const body = (await response.json().catch(() => null)) as
    | { messages?: { id?: unknown }[]; error?: { code?: unknown; error_data?: { details?: unknown } } }
    | null;
  if (!response.ok) {
    const metaCode = typeof body?.error?.code === "number" ? body.error.code : null;
    const details = typeof body?.error?.error_data?.details === "string" ? body.error.error_data.details : "";
    console.error(`[whatsapp] Code refusé par Meta pour ${maskPhone(to)} : HTTP ${response.status}, erreur ${metaCode ?? "inconnue"}.`);
    const explained = explainSendError(response.status, metaCode, details);
    // Erreurs de configuration (jeton, modèle…) : inutile d'inquiéter l'utilisateur avec le détail technique.
    const error = explained.fatal
      ? "L’envoi du code par WhatsApp est momentanément indisponible. Réessayez dans quelques minutes."
      : metaCode === 131026
        ? "Ce numéro ne semble pas utiliser WhatsApp. Vérifiez-le ou utilisez un autre numéro."
        : "WhatsApp n’a pas pu envoyer le code à ce numéro. Vérifiez-le et réessayez.";
    return { ok: false, reason: "rejected", error };
  }
  const id = body?.messages?.[0]?.id;
  return { ok: true, messageId: typeof id === "string" ? id.slice(0, 128) : null };
}
