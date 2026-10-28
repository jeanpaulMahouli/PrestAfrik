import "server-only";

// Adaptateur WhatsApp Business Cloud API (Meta) : vérification des identifiants et envoi de modèles
// de messages (campagnes marketing des boutiques, codes de vérification de PrestAfrik).
// Les statuts de distribution arrivent par le webhook /api/webhooks/whatsapp.

const defaultGraphApiVersion = "v23.0";

export function graphApiBaseUrl() {
  const configured = process.env.WHATSAPP_GRAPH_API_VERSION?.trim();
  const version = configured && /^v\d+\.\d+$/.test(configured) ? configured : defaultGraphApiVersion;
  return `https://graph.facebook.com/${version}`;
}

export type CloudApiCheckResult =
  | { ok: true; displayPhoneNumber: string | null; verifiedName: string | null }
  | { ok: false; error: string };

export async function verifyCloudApiCredentials({
  phoneNumberId,
  accessToken,
}: {
  phoneNumberId: string;
  accessToken: string;
}): Promise<CloudApiCheckResult> {
  const url = new URL(`${graphApiBaseUrl()}/${encodeURIComponent(phoneNumberId)}`);
  url.searchParams.set("fields", "display_phone_number,verified_name");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, error: "Meta ne répond pas. Vérifie la connexion internet et réessaie." };
  }

  const body = (await response.json().catch(() => null)) as
    | { display_phone_number?: unknown; verified_name?: unknown; error?: { code?: unknown } }
    | null;

  if (!response.ok) {
    const code = typeof body?.error?.code === "number" ? body.error.code : null;
    if (response.status === 401 || code === 190) {
      return { ok: false, error: "Le jeton d’accès est invalide ou a expiré." };
    }
    if (response.status === 400 || response.status === 404 || code === 100) {
      return { ok: false, error: "L’identifiant du numéro est introuvable pour ce jeton." };
    }
    if (response.status === 403 || code === 10 || code === 200) {
      return { ok: false, error: "Ce jeton n’a pas les autorisations WhatsApp nécessaires." };
    }
    return { ok: false, error: `Meta a refusé la vérification (erreur ${response.status}).` };
  }

  return {
    ok: true,
    displayPhoneNumber:
      typeof body?.display_phone_number === "string" ? body.display_phone_number.slice(0, 40) : null,
    verifiedName: typeof body?.verified_name === "string" ? body.verified_name.slice(0, 120) : null,
  };
}

export type SendTemplateResult = { ok: true; messageId: string | null } | { ok: false; error: string; fatal: boolean };

/** Erreurs Meta les plus courantes, expliquées au vendeur. « fatal » : inutile d'essayer les destinataires suivants. */
export function explainSendError(status: number, code: number | null, details: string): { error: string; fatal: boolean } {
  if (status === 401 || code === 190) return { error: "Le jeton d’accès WhatsApp est invalide ou a expiré.", fatal: true };
  if (code === 132001) return { error: "Le modèle de message est introuvable ou n’est pas approuvé dans cette langue.", fatal: true };
  if (code === 132000) return { error: "Le modèle de message doit contenir une variable {{1}} dans son texte.", fatal: true };
  if (code === 132015 || code === 132016) return { error: "Le modèle de message est suspendu ou désactivé par Meta.", fatal: true };
  if (code === 131031 || code === 131042) return { error: "Le compte WhatsApp Business est bloqué ou a un problème de paiement chez Meta.", fatal: true };
  if (status === 403 || code === 10 || code === 200) return { error: "Le jeton n’a pas les autorisations d’envoi WhatsApp.", fatal: true };
  if (code === 131026) return { error: "Ce numéro n’utilise pas WhatsApp ou ne peut pas recevoir le message.", fatal: false };
  if (code === 131049) return { error: "Meta a limité l’envoi à ce client (trop de messages marketing reçus récemment).", fatal: false };
  if (code === 131050) return { error: "Le client a refusé les messages marketing de votre entreprise sur WhatsApp.", fatal: false };
  if (code === 130429 || code === 131056 || code === 80007) return { error: "Trop d’envois en peu de temps : réessayez dans quelques minutes.", fatal: true };
  return { error: `WhatsApp a refusé l’envoi (erreur ${code ?? status}${details ? ` : ${details}` : ""}).`.slice(0, 280), fatal: false };
}

/**
 * Envoie un modèle de message approuvé par Meta (obligatoire pour écrire en premier à un client).
 * Le texte de la campagne remplit la variable {{1}} du modèle.
 */
export async function sendTemplateMessage({
  phoneNumberId,
  accessToken,
  to,
  templateName,
  language,
  bodyText,
}: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  language: string;
  bodyText: string;
}): Promise<SendTemplateResult> {
  // Meta refuse les retours à la ligne, tabulations et longues suites d'espaces dans une variable.
  const text = bodyText.replace(/[\r\n\t]+/g, " · ").replace(/ {4,}/g, "   ").trim().slice(0, 1000);
  let response: Response;
  try {
    response = await fetch(`${graphApiBaseUrl()}/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: templateName,
          language: { code: language },
          components: [{ type: "body", parameters: [{ type: "text", text }] }],
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, error: "Meta ne répond pas. Vérifiez la connexion et réessayez.", fatal: true };
  }
  const body = (await response.json().catch(() => null)) as
    | { messages?: { id?: unknown }[]; error?: { code?: unknown; message?: unknown; error_data?: { details?: unknown } } }
    | null;
  if (!response.ok) {
    const code = typeof body?.error?.code === "number" ? body.error.code : null;
    const details = typeof body?.error?.error_data?.details === "string" ? body.error.error_data.details : "";
    return { ok: false, ...explainSendError(response.status, code, details) };
  }
  const id = body?.messages?.[0]?.id;
  return { ok: true, messageId: typeof id === "string" ? id.slice(0, 128) : null };
}
