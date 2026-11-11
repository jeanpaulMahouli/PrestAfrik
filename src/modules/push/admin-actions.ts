"use server";

import type { PushNotificationKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ImageUploadError, saveStoreImage } from "@/lib/uploads";
import { logAdminAction, requirePlatformAdmin } from "@/modules/admin/context";
import { isPushConfigured, sendTemplatedPush } from "@/modules/push/sender";
import { defaultPushTemplates, pushKinds, safePushUrl } from "@/modules/push/templates";

// Administration → Notifications push : textes des notifications automatiques et envoi d'une nouveauté.

/** Dossier des photos jointes aux notifications (même rangement que les images des annonces). */
const pushMediaId = "prestafriknotifications0";
/** Format conseillé par les navigateurs pour la grande image d'une notification (2:1). */
const pushImageFrame = { width: 1200, height: 600 };

/** Dernier envoi manuel (essai compris) : repris dans le formulaire pour le prochain envoi. */
export async function lastManualPush() {
  return prisma.pushNotificationLog.findFirst({ where: { kind: "NEWS", url: { not: null } }, orderBy: { createdAt: "desc" }, select: { title: true, body: true, url: true, imageUrl: true } });
}

const pagePath = "/admin/notifications-push";

function back(message: string, kind: "succes" | "erreur" = "succes"): never {
  redirect(`${pagePath}?${kind}=${encodeURIComponent(message)}`);
}

const textSchema = z.object({
  kind: z.enum(pushKinds),
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères.").max(80, "Le titre ne peut pas dépasser 80 caractères."),
  body: z.string().trim().min(5, "Le message doit contenir au moins 5 caractères.").max(240, "Le message ne peut pas dépasser 240 caractères."),
  url: z.string().trim().max(200).regex(/^\/(?!\/)/, "Le lien doit être une page de PrestAfrik, par exemple /dashboard."),
});

/** Texte d'une notification automatique (et activation / désactivation). */
export async function updatePushTemplate(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const parsed = textSchema.safeParse({ kind: formData.get("kind"), title: formData.get("title"), body: formData.get("body"), url: formData.get("url") });
  if (!parsed.success) back(parsed.error.issues[0]?.message ?? "Texte invalide.", "erreur");
  const { kind, title, body } = parsed.data;
  const url = safePushUrl(parsed.data.url);
  const enabled = formData.get("enabled") === "on";
  await prisma.$transaction(async (tx) => {
    await tx.pushNotificationTemplate.upsert({ where: { kind }, create: { kind, title, body, url, enabled }, update: { title, body, url, enabled } });
    await logAdminAction(admin.id, { action: "push.template", targetType: "push", targetId: kind, details: { title, body, url, enabled } }, tx);
  });
  revalidatePath(pagePath);
  back("Message enregistré.");
}

/** Retour au texte proposé par PrestAfrik. */
export async function resetPushTemplate(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const kind = z.enum(pushKinds).safeParse(formData.get("kind"));
  if (!kind.success) back("Type de notification inconnu.", "erreur");
  await prisma.pushNotificationTemplate.deleteMany({ where: { kind: kind.data } });
  await logAdminAction(admin.id, { action: "push.template", targetType: "push", targetId: kind.data, details: { reset: true, ...defaultPushTemplates[kind.data] } });
  revalidatePath(pagePath);
  back("Texte par défaut rétabli.");
}

/**
 * Envoi manuel (nouveauté, information) : à tous les vendeurs abonnés, ou seulement à l'administrateur
 * connecté pour un essai. Les variables {prenom} et {boutique} sont remplacées pour chaque vendeur.
 */
export async function broadcastPush(formData: FormData) {
  const admin = await requirePlatformAdmin();
  if (!isPushConfigured()) back("Les notifications push ne sont pas configurées (clés VAPID manquantes).", "erreur");
  const parsed = textSchema.safeParse({ kind: "NEWS", title: formData.get("title"), body: formData.get("body"), url: formData.get("url") });
  if (!parsed.success) back(parsed.error.issues[0]?.message ?? "Message invalide.", "erreur");
  const testOnly = formData.get("mode") === "test";
  const kind: PushNotificationKind = "NEWS";

  // Photo facultative : nouvelle photo choisie, sinon celle du dernier envoi si elle est gardée, sinon aucune
  // (la notification montre alors seulement le logo PrestAfrik).
  let image: string | null = null;
  try {
    const saved = await saveStoreImage(formData.get("image"), pushMediaId, { frame: pushImageFrame });
    image = saved?.url ?? null;
  } catch (error) {
    if (error instanceof ImageUploadError) back(error.message, "erreur");
    throw error;
  }
  if (!image && formData.get("keepImage") === "on") image = (await lastManualPush())?.imageUrl ?? null;

  const users = await prisma.user.findMany({
    where: { suspendedAt: null, pushSubscriptions: { some: {} }, ...(testOnly ? { id: admin.id } : { memberships: { some: {} } }) },
    select: { id: true, name: true, lastActiveStore: { select: { name: true } }, memberships: { orderBy: { createdAt: "asc" }, take: 1, select: { store: { select: { name: true } } } } },
  });
  if (!users.length) back(testOnly ? "Activez d’abord les notifications sur cet appareil (Mon profil, dans l’espace vendeur)." : "Aucun vendeur n’a encore activé les notifications.", "erreur");

  const result = await sendTemplatedPush(
    kind,
    users.map((user) => ({ userId: user.id, vars: { prenom: user.name.trim().split(/\s+/)[0], boutique: user.lastActiveStore?.name ?? user.memberships[0]?.store.name ?? "votre boutique" } })),
    { template: { kind, enabled: true, title: parsed.data.title, body: parsed.data.body, url: safePushUrl(parsed.data.url) }, sentById: admin.id, tag: testOnly ? "essai" : "nouveaute", image, logManual: true },
  );
  if (!testOnly) {
    await logAdminAction(admin.id, { action: "push.broadcast", targetType: "push", targetId: kind, details: { title: parsed.data.title, image, recipients: result.recipients, delivered: result.delivered } });
  }
  revalidatePath(pagePath);
  back(
    testOnly
      ? result.delivered
        ? "Notification d’essai envoyée sur vos appareils."
        : "La notification d’essai n’a pas pu partir : réactivez les notifications sur cet appareil."
      : `Notification envoyée à ${result.recipients} vendeur${result.recipients > 1 ? "s" : ""} (${result.delivered} appareil${result.delivered > 1 ? "s" : ""}).`,
    result.delivered ? "succes" : "erreur",
  );
}
