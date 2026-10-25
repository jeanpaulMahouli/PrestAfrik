import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { storefrontTag } from "@/modules/catalog/service";
import { defaultChatConfig } from "@/modules/chat/config";
import { getStorefrontWhatsapp } from "@/modules/whatsapp/settings";

export type StorefrontZone = { id: string; label: string; city: string; feeXaf: number; delay: string | null };

/**
 * Informations publiques de la boutique utilisées par la vitrine : zones à frais fixes
 * (ADR-013), retrait, coordonnées, WhatsApp, assistant et pages publiées.
 */
export async function getStorefrontExtras(storeId: string) {
  const [data, whatsapp] = await Promise.all([
    unstable_cache(
      async () => {
        const [store, zones, chat, quickReplies, pages] = await Promise.all([
          prisma.store.findUniqueOrThrow({
            where: { id: storeId },
            select: { pickupEnabled: true, pickupAddress: true, pickupHours: true, address: true, city: true, neighborhood: true, contactEmail: true, phoneE164: true, contactPhone: true },
          }),
          prisma.deliveryZone.findMany({
            where: { storeId, isActive: true, feeXaf: { not: null } },
            orderBy: [{ feeXaf: "asc" }, { name: "asc" }],
            select: { id: true, name: true, city: true, feeXaf: true, estimatedDelay: true },
          }),
          prisma.storeChatConfig.findUnique({ where: { storeId } }),
          prisma.storeChatQuickReply.findMany({ where: { storeId, enabled: true }, orderBy: { position: "asc" }, select: { label: true, answer: true } }),
          prisma.storePage.findMany({ where: { storeId, status: "PUBLISHED" }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { title: true, slug: true } }),
        ]);
        return {
          store,
          zones: zones.map((zone) => ({
            id: zone.id,
            label: zone.name.toLowerCase().includes(zone.city.toLowerCase()) ? zone.name : `${zone.name} · ${zone.city}`,
            city: zone.city,
            feeXaf: zone.feeXaf ?? 0,
            delay: zone.estimatedDelay,
          })) satisfies StorefrontZone[],
          chat: chat
            ? {
                enabled: chat.enabled,
                welcomeMessage: chat.welcomeMessage,
                transferTemplate: chat.transferTemplate,
                offHoursMessage: chat.offHoursMessage,
                showOn: { home: chat.showOnHome, product: chat.showOnProduct, cart: chat.showOnCart, checkout: chat.showOnCheckout },
                quickReplies,
              }
            : null,
          pages,
        };
      },
      ["storefront-extras", storeId],
      { revalidate: 60, tags: [storefrontTag(storeId)] },
    )(),
    getStorefrontWhatsapp(storeId),
  ]);

  const chatEnabled = Boolean(data.chat?.enabled && whatsapp.number);
  return {
    ...data,
    whatsappNumber: whatsapp.number,
    whatsappOrderEnabled: Boolean(whatsapp.number && whatsapp.productOrderButtonEnabled),
    customerTemplate: whatsapp.customerTemplate,
    chat: chatEnabled && data.chat ? data.chat : null,
    defaultChat: defaultChatConfig,
  };
}

export type StorefrontExtras = Awaited<ReturnType<typeof getStorefrontExtras>>;

/** Phrase d'information affichée en haut du catalogue (« Livraison à Douala dès 1 000 FCFA… »). */
export function deliverySummary(extras: Pick<StorefrontExtras, "zones" | "store">, format: (value: number) => string) {
  const parts: string[] = [];
  if (extras.zones.length) {
    const cheapest = extras.zones[0];
    const cities = [...new Set(extras.zones.map((zone) => zone.city))];
    const where = cities.length === 1 ? `à ${cities[0]}` : `dans ${cities.length} villes`;
    parts.push(cheapest.feeXaf === 0 ? `Livraison gratuite ${where}` : `Livraison ${where} dès ${format(cheapest.feeXaf)}`);
  }
  if (extras.store.pickupEnabled) parts.push(extras.zones.length ? "retrait possible en boutique" : "Retrait en boutique");
  const sentence = parts.join(", ");
  return sentence ? `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}. Paiement à la livraison.` : "Paiement à la livraison.";
}
