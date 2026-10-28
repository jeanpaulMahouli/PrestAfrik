import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMetaSignature, verifyWebhookSubscription, webhookStatuses } from "@/modules/whatsapp/webhook";

// Webhook WhatsApp Business (Meta) du compte PrestAfrik : https://<domaine>/api/webhooks/whatsapp
//   GET   vérification de l'abonnement (hub.mode, hub.verify_token, hub.challenge)
//   POST  événements signés (X-Hub-Signature-256) : statuts de distribution des codes de vérification
// Configuration pas à pas : docs/whatsapp-meta.md.

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const challenge = verifyWebhookSubscription(params, process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN);
  if (challenge === null) return new NextResponse("Forbidden", { status: 403 });
  return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  const raw = await request.text();
  if (!appSecret) {
    // Sans secret, impossible de prouver que l'appel vient de Meta : rien n'est traité.
    console.error("[whatsapp:webhook] WHATSAPP_APP_SECRET manquant : événement ignoré.");
    return new NextResponse("Webhook non configuré", { status: 503 });
  }
  if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"), appSecret)) {
    return new NextResponse("Signature invalide", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("JSON invalide", { status: 400 });
  }

  // Statut de distribution des codes (sent, delivered, read, failed) : affiché sur l'écran de saisie du code.
  const statuses = webhookStatuses(payload);
  for (const status of statuses) {
    await prisma.phoneVerification
      .updateMany({
        where: { messageId: status.messageId },
        data: { deliveryStatus: status.status, deliveryError: status.error },
      })
      .catch((error: unknown) => console.error("[whatsapp:webhook] Mise à jour du statut impossible", error instanceof Error ? error.message : error));
    if (status.status === "failed") console.warn(`[whatsapp:webhook] Message non distribué (erreur ${status.errorCode ?? "inconnue"}).`);
  }
  // Meta attend une réponse 200 rapide, sinon il renvoie l'événement.
  return NextResponse.json({ received: true });
}
