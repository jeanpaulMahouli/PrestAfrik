"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prospectionMessageKeys, prospectionMessages } from "@/config/prospection";
import { prisma } from "@/lib/prisma";
import { logAdminAction, requirePlatformAdmin } from "@/modules/admin/context";

// Administration → Prospection : personnalisation des messages WhatsApp pré-remplis.

const listPath = "/admin/prospection";
const maxLength = 1000;

function back(message: string, kind: "succes" | "erreur" = "succes"): never {
  redirect(`${listPath}?messages=1&${kind}=${encodeURIComponent(message)}#messages-whatsapp`);
}

/** Enregistre les messages : un texte identique au message par défaut (ou vide) revient au défaut. */
export async function saveProspectionMessages(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const values = prospectionMessageKeys.map((key) => {
    const raw = formData.get(`message-${key}`);
    const body = typeof raw === "string" ? raw.replace(/\r\n/g, "\n").trim() : "";
    return { key, body };
  });
  const tooLong = values.find((value) => value.body.length > maxLength);
  if (tooLong) back(`Un message dépasse ${maxLength} caractères : raccourcissez-le.`, "erreur");

  await prisma.$transaction(
    values.map(({ key, body }) =>
      !body || body === prospectionMessages[key]
        ? prisma.prospectionMessage.deleteMany({ where: { key } })
        : prisma.prospectionMessage.upsert({ where: { key }, create: { key, body }, update: { body } }),
    ),
  );
  await logAdminAction(admin.id, { action: "prospection.messages", targetType: "prospection", targetId: "messages" });
  revalidatePath(listPath);
  back("Messages WhatsApp enregistrés.");
}

/** Remet tous les messages par défaut. */
export async function resetProspectionMessages() {
  const admin = await requirePlatformAdmin();
  await prisma.prospectionMessage.deleteMany({});
  await logAdminAction(admin.id, { action: "prospection.messages_reset", targetType: "prospection", targetId: "messages" });
  revalidatePath(listPath);
  back("Messages par défaut rétablis.");
}
