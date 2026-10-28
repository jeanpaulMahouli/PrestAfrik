import { createHmac, timingSafeEqual } from "node:crypto";

// Webhook WhatsApp Business (Meta) : vérification de l'abonnement, de la signature et lecture des statuts.
// Fonctions pures, testées dans tests/whatsapp-webhook.test.ts.

/** GET de vérification : renvoie hub.challenge si le jeton correspond, sinon null. */
export function verifyWebhookSubscription(params: URLSearchParams, expectedToken: string | undefined) {
  const token = params.get("hub.verify_token") ?? "";
  const expected = expectedToken?.trim() ?? "";
  if (params.get("hub.mode") !== "subscribe" || !expected || expected.length < 16) return null;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const challenge = params.get("hub.challenge") ?? "";
  return /^[\w-]{1,200}$/.test(challenge) ? challenge : null;
}

/** En-tête X-Hub-Signature-256 : « sha256= » + HMAC-SHA256 du corps brut avec la clé secrète de l'application. */
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const received = Buffer.from(header.slice(7), "hex");
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export type WebhookStatus = { messageId: string; status: "sent" | "delivered" | "read" | "failed"; error: string | null; errorCode: number | null };

const knownStatuses = new Set(["sent", "delivered", "read", "failed"]);

/** Statuts de messages contenus dans un événement (entry[].changes[].value.statuses[]). */
export function webhookStatuses(payload: unknown): WebhookStatus[] {
  const result: WebhookStatus[] = [];
  const entries = (payload as { object?: unknown; entry?: unknown })?.entry;
  if ((payload as { object?: unknown })?.object !== "whatsapp_business_account" || !Array.isArray(entries)) return result;
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const statuses = (change as { value?: { statuses?: unknown } })?.value?.statuses;
      if (!Array.isArray(statuses)) continue;
      for (const item of statuses) {
        const { id, status, errors } = (item ?? {}) as { id?: unknown; status?: unknown; errors?: unknown };
        if (typeof id !== "string" || typeof status !== "string" || !knownStatuses.has(status)) continue;
        const first = Array.isArray(errors) ? (errors[0] as { code?: unknown; title?: unknown } | undefined) : undefined;
        const errorCode = typeof first?.code === "number" ? first.code : null;
        const title = typeof first?.title === "string" ? first.title : null;
        result.push({
          messageId: id.slice(0, 128),
          status: status as WebhookStatus["status"],
          error: status === "failed" ? `${errorCode ?? ""} ${title ?? ""}`.trim().slice(0, 200) || "Message non distribué" : null,
          errorCode,
        });
      }
    }
  }
  return result;
}
