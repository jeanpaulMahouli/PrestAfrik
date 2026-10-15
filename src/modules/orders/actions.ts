"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { parsePhone } from "@/lib/phone";
import { clientIpFrom } from "@/lib/request-ip";
import { notifyNewOrder } from "@/modules/email/notifications";
import { checkoutOrder, CheckoutProblem, type CartLine } from "@/modules/orders/checkout";

const checkoutSchema = z.object({
  storeSlug: z.string().min(3).max(40),
  name: z.string().trim().min(2, "Indiquez votre nom.").max(120),
  whatsappCountry: z.string().max(2),
  whatsappNational: z.string().max(30),
  deliveryMethod: z.enum(["DELIVERY", "PICKUP"], { error: "Choisissez la livraison ou le retrait." }),
  zoneId: z.string().max(40),
  landmark: z.string().trim().max(250),
  comment: z.string().trim().max(500),
  followUpConsent: z.literal("on", { error: "Acceptez de recevoir le suivi de votre commande sur WhatsApp." }),
  marketingConsent: z.boolean(),
  items: z.string().max(20_000),
  idempotencyKey: z.uuid(),
  expectedTotalXaf: z.coerce.number().int().min(0).max(1_000_000_000),
});

export type CheckoutActionState =
  | { error: string; field?: string; reference?: never; trackingToken?: never }
  | { error?: never; reference: string; trackingToken: string }
  | null;

const itemsSchema = z
  .array(z.object({ productId: z.cuid(), variantId: z.cuid().nullable(), quantity: z.number().int().min(1).max(25) }))
  .min(1)
  .max(30);

/** Enregistre la commande du client (sans compte). Le vendeur la reçoit « Nouvelle ». */
export async function checkoutOrderAction(_previousState: CheckoutActionState, formData: FormData): Promise<CheckoutActionState> {
  const value = (key: string) => formData.get(key) ?? "";
  const parsed = checkoutSchema.safeParse({
    storeSlug: value("storeSlug"),
    name: value("name"),
    whatsappCountry: value("whatsappCountry"),
    whatsappNational: value("whatsappNational"),
    deliveryMethod: value("deliveryMethod"),
    zoneId: value("zoneId"),
    landmark: value("landmark"),
    comment: value("comment"),
    followUpConsent: formData.get("followUpConsent"),
    marketingConsent: formData.get("marketingConsent") === "on",
    items: value("items"),
    idempotencyKey: value("idempotencyKey"),
    expectedTotalXaf: value("expectedTotalXaf"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Vérifiez les informations de votre commande.", field: String(issue?.path[0] ?? "") };
  }
  const input = parsed.data;
  const phone = parsePhone(input.whatsappCountry || "CM", input.whatsappNational);
  if (!phone.ok) return { error: phone.message, field: "whatsapp" };
  if (input.deliveryMethod === "DELIVERY" && input.landmark.length < 3) {
    return { error: "Indiquez un point de repère pour aider le livreur.", field: "landmark" };
  }

  let items: CartLine[];
  try {
    items = itemsSchema.parse(JSON.parse(input.items) as unknown);
  } catch {
    return { error: "Votre panier n’est plus à jour. Vérifiez les produits avant de commander." };
  }

  try {
    const order = await checkoutOrder({
      storeSlug: input.storeSlug,
      customer: { name: input.name, whatsapp: phone.e164, email: null, followUpConsent: true, marketingConsent: input.marketingConsent },
      deliveryMethod: input.deliveryMethod,
      zoneId: input.deliveryMethod === "DELIVERY" ? input.zoneId || null : null,
      landmark: input.landmark || null,
      comment: input.comment || null,
      items,
      idempotencyKey: input.idempotencyKey,
      expectedTotalXaf: input.expectedTotalXaf,
      clientIp: clientIpFrom(await headers()),
    });
    if (order.created) notifyNewOrder(order.reference, order.storeId);
    return { reference: order.reference, trackingToken: order.trackingToken };
  } catch (error) {
    if (error instanceof CheckoutProblem) return { error: error.message };
    console.error("Échec inattendu lors de l’enregistrement d’une commande.", error);
    return { error: "La commande n’a pas pu être enregistrée. Réessayez dans un instant ; si le problème persiste, contactez la boutique." };
  }
}
