import "server-only";

// Adaptateur WhatsApp Business Cloud API (Meta). Seule la vérification des
// identifiants est branchée pour l'instant ; l'envoi automatique et les webhooks
// seront ajoutés avec le worker d'envoi.

const defaultGraphApiVersion = "v23.0";

function graphApiBaseUrl() {
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
