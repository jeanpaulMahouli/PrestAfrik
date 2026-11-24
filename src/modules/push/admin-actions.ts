"use server";

import type { PushNotificationKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ImageUploadError, saveStoreImage } from "@/lib/uploads";
import { logAdminAction, requirePlatformAdmin } from "@/modules/admin/context";
import { isPushConfigured, sendTemplatedPush } from "@/modules/push/sender";
import { audienceKeys, audienceWhere, type Audience } from "@/modules/notifications/audiences";
import { notifyUsers } from "@/modules/notifications/vendor";
import { defaultPushTemplates, pushKinds, renderPushText, safePushUrl } from "@/modules/push/templates";

// Administration → Notifications push : textes des notifications automatiques et envoi d'une nouveauté.

/** Dossier des photos jointes aux notifications (même rangement que les images des annonces). */
const pushMediaId = "prestafriknotifications0";
/** Format conseillé par les navigateurs pour la grande image d'une notification (2:1). */
const pushImageFrame = { width: 1200, height: 600 };

/** Dernier envoi manuel (essai compris) : repris dans le formulaire pour le prochain envoi. */
export async function lastManualPush() {
  return prisma.pushNotificationLog.findFirst({ where: { kind: { in: ["NEWS", "TIP"] }, url: { not: null } }, orderBy: { createdAt: "desc" }, select: { title: true, body: true, url: true, imageUrl: true } });
}

const pagePath = "/admin/notifications-push";

function back(message: string, kind: "succes" | "erreur" = "succes", tab?: "automatiques"): never {
  redirect(`${pagePath}?${tab ? `onglet=${tab}&` : ""}${kind}=${encodeURIComponent(message)}`);
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
  back("Message enregistré.", "succes", "automatiques");
}

/** Retour au texte proposé par PrestAfrik. */
export async function resetPushTemplate(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const kind = z.enum(pushKinds).safeParse(formData.get("kind"));
  if (!kind.success) back("Type de notification inconnu.", "erreur");
  await prisma.pushNotificationTemplate.deleteMany({ where: { kind: kind.data } });
  await logAdminAction(admin.id, { action: "push.template", targetType: "push", targetId: kind.data, details: { reset: true, ...defaultPushTemplates[kind.data] } });
  revalidatePath(pagePath);
  back("Texte par défaut rétabli.", "succes", "automatiques");
}

/**
 * Envoi manuel d'une nouveauté ou d'une astuce : dans le centre de notifications des vendeurs visés
 * (préférences respectées) et, si coché, en notification push sur leurs appareils. « Essai » : seulement
 * à l'administrateur connecté.
 * Règle : un second envoi au même public dans les 24 heures demande une confirmation explicite (fatigue).
 */
export async function broadcastPush(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const kindParsed = z.enum(["NEWS", "TIP"]).safeParse(formData.get("kind") ?? "NEWS");
  const kind: PushNotificationKind = kindParsed.success ? kindParsed.data : "NEWS";
  const parsed = textSchema.safeParse({ kind, title: formData.get("title"), body: formData.get("body"), url: formData.get("url") });
  if (!parsed.success) back(parsed.error.issues[0]?.message ?? "Message invalide.", "erreur");
  const testOnly = formData.get("mode") === "test";
  const audienceParsed = z.enum(audienceKeys as [Audience, ...Audience[]]).safeParse(formData.get("audience") ?? "tous");
  const audience: Audience = audienceParsed.success ? audienceParsed.data : "tous";
  const withPush = formData.get("push") === "on" && isPushConfigured();

  if (!testOnly && formData.get("confirmRepeat") !== "on") {
    const recent = await prisma.pushNotificationLog.findFirst({ where: { kind: { in: ["NEWS", "TIP"] }, audience, sentById: { not: null }, createdAt: { gte: new Date(Date.now() - 86_400_000) } }, select: { id: true } });
    if (recent) back("Ce public a déjà reçu un envoi ces dernières 24 heures. Cochez « Je confirme un nouvel envoi » pour continuer.", "erreur");
  }

  // Photo facultative : nouvelle photo choisie, sinon celle du dernier envoi si elle est gardée, sinon aucune.
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
    where: testOnly ? { id: admin.id } : audienceWhere(audience),
    select: { id: true, name: true, lastActiveStore: { select: { name: true } }, memberships: { orderBy: { createdAt: "asc" }, take: 1, select: { store: { select: { name: true } } } } },
  });
  if (!users.length) back(testOnly ? "Compte introuvable." : "Personne ne correspond à ce public pour le moment.", "erreur");

  const recipients = users.map((user) => ({ userId: user.id, vars: { prenom: user.name.trim().split(/\s+/)[0], boutique: user.lastActiveStore?.name ?? user.memberships[0]?.store.name ?? "votre boutique" } }));
  // Centre de notifications : texte personnalisé pour chacun (prénom, boutique).
  let inApp = 0;
  for (const recipient of recipients) {
    inApp += await notifyUsers([recipient.userId], {
      kind: kind === "TIP" ? "TIP" : "NEWS",
      title: renderPushText(parsed.data.title, recipient.vars),
      body: renderPushText(parsed.data.body, recipient.vars),
      url: safePushUrl(parsed.data.url),
      imageUrl: image,
    });
  }
  const push = withPush
    ? await sendTemplatedPush(kind, recipients, { template: { kind, enabled: true, title: parsed.data.title, body: parsed.data.body, url: safePushUrl(parsed.data.url) }, sentById: admin.id, tag: testOnly ? "essai" : kind === "TIP" ? "astuce" : "nouveaute", image, logManual: true, audience: testOnly ? "essai" : audience })
    : { recipients: 0, delivered: 0 };
  if (!withPush) {
    // Historique même sans push : l'envoi dans l'application est inscrit.
    await prisma.pushNotificationLog.create({ data: { kind, title: parsed.data.title, body: parsed.data.body, url: safePushUrl(parsed.data.url), imageUrl: image, recipients: inApp, delivered: 0, sentById: admin.id, audience: testOnly ? "essai" : audience } });
  }
  if (!testOnly) {
    await logAdminAction(admin.id, { action: "push.broadcast", targetType: "push", targetId: kind, details: { title: parsed.data.title, audience, image, inApp, pushRecipients: push.recipients, delivered: push.delivered } });
  }
  revalidatePath(pagePath);
  back(
    testOnly
      ? "Essai envoyé : regardez votre cloche (et votre téléphone si les push sont activés)."
      : `Envoyé à ${inApp} vendeur${inApp > 1 ? "s" : ""} dans l’application${withPush ? `, ${push.delivered} appareil${push.delivered > 1 ? "s" : ""} en push` : ""}.`,
  );
}
