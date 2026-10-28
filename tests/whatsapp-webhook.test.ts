import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMetaSignature, verifyWebhookSubscription, webhookStatuses } from "../src/modules/whatsapp/webhook";

const token = "jeton-de-verification-123456";

describe("webhook WhatsApp", () => {
  it("valide l'abonnement uniquement avec le bon jeton", () => {
    const params = (values: Record<string, string>) => new URLSearchParams(values);
    expect(verifyWebhookSubscription(params({ "hub.mode": "subscribe", "hub.verify_token": token, "hub.challenge": "1158201444" }), token)).toBe("1158201444");
    expect(verifyWebhookSubscription(params({ "hub.mode": "subscribe", "hub.verify_token": "mauvais", "hub.challenge": "1" }), token)).toBeNull();
    expect(verifyWebhookSubscription(params({ "hub.mode": "unsubscribe", "hub.verify_token": token, "hub.challenge": "1" }), token)).toBeNull();
    // Jeton absent ou trop court côté serveur : refus systématique.
    expect(verifyWebhookSubscription(params({ "hub.mode": "subscribe", "hub.verify_token": "", "hub.challenge": "1" }), "")).toBeNull();
    expect(verifyWebhookSubscription(params({ "hub.mode": "subscribe", "hub.verify_token": "court", "hub.challenge": "1" }), "court")).toBeNull();
    expect(verifyWebhookSubscription(params({ "hub.mode": "subscribe", "hub.verify_token": token, "hub.challenge": "<script>" }), token)).toBeNull();
  });

  it("vérifie la signature X-Hub-Signature-256", () => {
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const signature = `sha256=${createHmac("sha256", "secret-app").update(body).digest("hex")}`;
    expect(verifyMetaSignature(body, signature, "secret-app")).toBe(true);
    expect(verifyMetaSignature(body, signature, "autre-secret")).toBe(false);
    expect(verifyMetaSignature(`${body} `, signature, "secret-app")).toBe(false);
    expect(verifyMetaSignature(body, null, "secret-app")).toBe(false);
    expect(verifyMetaSignature(body, "sha1=abc", "secret-app")).toBe(false);
  });

  it("lit les statuts de distribution", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                statuses: [
                  { id: "wamid.A", status: "delivered" },
                  { id: "wamid.B", status: "failed", errors: [{ code: 131026, title: "Message undeliverable" }] },
                  { id: "wamid.C", status: "inconnu" },
                ],
              },
            },
          ],
        },
      ],
    };
    expect(webhookStatuses(payload)).toEqual([
      { messageId: "wamid.A", status: "delivered", error: null, errorCode: null },
      { messageId: "wamid.B", status: "failed", error: "131026 Message undeliverable", errorCode: 131026 },
    ]);
    expect(webhookStatuses({ object: "page", entry: [] })).toEqual([]);
    expect(webhookStatuses(null)).toEqual([]);
  });
});
