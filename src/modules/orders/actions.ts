"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { checkoutOrder, CheckoutProblem, type CartLine } from "@/modules/orders/checkout";

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Indique ton nom.").max(120),
  whatsapp: z.string().trim().min(9).max(30),
  email: z.union([z.literal(""), z.string().trim().email().max(254)]),
  city: z.string().trim().min(2, "Indique ta ville.").max(100),
  neighborhood: z.string().trim().min(1, "Indique ton quartier.").max(120),
  landmark: z.string().trim().max(250),
  deliveryMethod: z.enum(["DELIVERY", "PICKUP"]),
  comment: z.string().trim().max(500),
  followUpConsent: z.literal("on", { error: "Accepte le suivi de ta commande sur WhatsApp." }),
  marketingConsent: z.boolean(),
  items: z.string().max(20_000),
  idempotencyKey: z.uuid(),
  quoteToken: z.string().min(10).max(2000),
});

export type CheckoutActionState =
  | { error: string; reference?: never; trackingToken?: never }
  | { error?: never; reference: string; trackingToken: string }
  | null;

function normalizeWhatsapp(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  const normalized = digits.startsWith("237") ? digits : `237${digits}`;
  if (!/^237[2-9]\d{8}$/.test(normalized)) {
    throw new CheckoutProblem("Indique un numéro WhatsApp camerounais valide avec son indicatif +237.");
  }
  return `+${normalized}`;
}

export async function checkoutOrderAction(
  _previousState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const parsed = checkoutSchema.safeParse({
    name: formData.get("name"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email") ?? "",
    city: formData.get("city"),
    neighborhood: formData.get("neighborhood"),
    landmark: formData.get("landmark") ?? "",
    deliveryMethod: formData.get("deliveryMethod"),
    comment: formData.get("comment") ?? "",
    followUpConsent: formData.get("followUpConsent"),
    marketingConsent: formData.get("marketingConsent") === "on",
    items: formData.get("items"),
    idempotencyKey: formData.get("idempotencyKey"),
    quoteToken: formData.get("quoteToken"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Vérifie les informations de ta commande." };
  }

  let items: CartLine[];
  try {
    items = z
      .array(
        z.object({
          productId: z.cuid(),
          variantId: z.cuid().nullable(),
          quantity: z.number().int().min(1).max(25),
        }),
      )
      .min(1)
      .max(30)
      .parse(JSON.parse(parsed.data.items) as unknown);
  } catch {
    return { error: "Ton panier n’est plus à jour. Vérifie les produits avant de commander." };
  }

  try {
    const whatsapp = normalizeWhatsapp(parsed.data.whatsapp);
    const requestHeaders = await headers();
    const clientIp =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      requestHeaders.get("x-real-ip") ||
      "unknown";

    return await checkoutOrder({
      storeSlug: String(formData.get("storeSlug") ?? ""),
      customer: {
        name: parsed.data.name,
        whatsapp,
        email: parsed.data.email || null,
        followUpConsent: true,
        marketingConsent: parsed.data.marketingConsent,
      },
      deliveryMethod: parsed.data.deliveryMethod,
      city: parsed.data.city,
      neighborhood: parsed.data.neighborhood,
      landmark: parsed.data.landmark || null,
      comment: parsed.data.comment || null,
      items,
      idempotencyKey: parsed.data.idempotencyKey,
      quoteToken: parsed.data.quoteToken,
      clientIp,
    });
  } catch (error) {
    if (error instanceof CheckoutProblem) return { error: error.message };
    console.error("Échec inattendu lors de la validation d’une commande.", error);
    return {
      error: "La commande n’a pas pu être enregistrée. Réessaie dans un instant ; si le problème persiste, contacte la boutique.",
    };
  }
}
