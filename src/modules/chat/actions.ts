"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/modules/auth/permissions";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { chatConfigSchema } from "@/modules/chat/config";
import { getStoreContext } from "@/modules/stores/context";

export type ChatSaveState = null | { ok: true } | { ok: false; message: string };

export async function saveChatAssistant(_previous: ChatSaveState, formData: FormData): Promise<ChatSaveState> {
  const { store, membership } = await getStoreContext();
  if (!hasPermission(membership.role, "store.manage")) return { ok: false, message: "Vous n’avez pas l’autorisation de modifier la boutique." };

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("config") ?? ""));
  } catch {
    return { ok: false, message: "Les réglages envoyés sont illisibles. Rechargez la page." };
  }
  const parsed = chatConfigSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Vérifiez les réglages." };
  const { quickReplies, offHoursMessage, ...config } = parsed.data;

  if (config.enabled) {
    const whatsapp = await prisma.whatsappSettings.findUnique({ where: { storeId: store.id }, select: { businessNumber: true } });
    const storePhone = await prisma.store.findUnique({ where: { id: store.id }, select: { phoneE164: true } });
    if (!whatsapp?.businessNumber && !storePhone?.phoneE164) {
      return { ok: false, message: "Ajoutez d’abord le numéro WhatsApp de la boutique (page « Messages WhatsApp »)." };
    }
  }

  await prisma.$transaction([
    prisma.storeChatConfig.upsert({
      where: { storeId: store.id },
      create: { storeId: store.id, ...config, offHoursMessage: offHoursMessage || null },
      update: { ...config, offHoursMessage: offHoursMessage || null },
    }),
    prisma.storeChatQuickReply.deleteMany({ where: { storeId: store.id } }),
    prisma.storeChatQuickReply.createMany({
      data: quickReplies.map((reply, position) => ({ storeId: store.id, position, ...reply })),
    }),
  ]);
  revalidatePath("/dashboard/boutique/assistant");
  invalidateStorefrontCache(store.id, store.slug);
  return { ok: true };
}
