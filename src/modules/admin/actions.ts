"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeAlerts, listOpenAlerts } from "@/modules/admin/alerts";
import { isAdminRole, logAdminAction, requirePlatformAdmin } from "@/modules/admin/context";
import { auth } from "@/modules/auth/server";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { sendEmailQuietly } from "@/modules/email/server";

const id = z.string().min(10).max(64).regex(/^[A-Za-z0-9_-]+$/);
const reason = z.string().trim().min(5, "Indiquez un motif d’au moins 5 caractères.").max(300, "Le motif ne peut pas dépasser 300 caractères.");
const appUrl = (path: string) => new URL(path, process.env.BETTER_AUTH_URL ?? "http://localhost:3000").toString();

/** Retour sur la page d'origine avec un message (succès ou erreur) affiché en bandeau. */
function back(formData: FormData, fallback: string, message: string, kind: "succes" | "erreur" = "succes"): never {
  const requested = String(formData.get("retour") ?? "");
  const target = /^\/admin(?:[/?][^\s]*)?$/.test(requested) ? requested : fallback;
  const url = new URL(target, "http://local");
  url.searchParams.delete("succes");
  url.searchParams.delete("erreur");
  url.searchParams.set(kind, message);
  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

/* ---------- Boutiques ---------- */

export async function suspendStore(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const storeId = id.safeParse(formData.get("storeId"));
  const motif = reason.safeParse(formData.get("reason"));
  if (!storeId.success) back(formData, "/admin/boutiques","Boutique introuvable.", "erreur");
  if (!motif.success) back(formData, "/admin/boutiques",motif.error.issues[0]?.message ?? "Motif invalide.", "erreur");

  const store = await prisma.store.findUnique({ where: { id: storeId.data }, select: { id: true, name: true, slug: true, suspendedAt: true } });
  if (!store) back(formData, "/admin/boutiques","Boutique introuvable.", "erreur");
  if (store.suspendedAt) back(formData, "/admin/boutiques",`${store.name} est déjà suspendue.`, "erreur");

  await prisma.$transaction(async (tx) => {
    await tx.store.update({ where: { id: store.id }, data: { suspendedAt: new Date(), suspensionReason: motif.data } });
    await logAdminAction(admin.id, { action: "store.suspend", targetType: "store", targetId: store.id, storeId: store.id, details: { reason: motif.data } }, tx);
  });
  invalidateStorefrontCache(store.id, store.slug);

  // E20 : chaque propriétaire est prévenu, avec le motif.
  const owners = await prisma.storeMembership.findMany({ where: { storeId: store.id, role: "OWNER" }, select: { user: { select: { email: true } } } });
  for (const owner of owners) {
    await sendEmailQuietly("E20", owner.user.email, { boutique: store.name, motif: motif.data }, appUrl("/dashboard"));
  }
  revalidatePath("/admin", "layout");
  back(formData, "/admin/boutiques",`${store.name} est suspendue. Le propriétaire a été prévenu par e-mail.`);
}

export async function restoreStore(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const storeId = id.safeParse(formData.get("storeId"));
  if (!storeId.success) back(formData, "/admin/boutiques","Boutique introuvable.", "erreur");
  const store = await prisma.store.findUnique({ where: { id: storeId.data }, select: { id: true, name: true, slug: true, suspendedAt: true } });
  if (!store?.suspendedAt) back(formData, "/admin/boutiques","Cette boutique n’est pas suspendue.", "erreur");

  await prisma.$transaction(async (tx) => {
    await tx.store.update({ where: { id: store.id }, data: { suspendedAt: null, suspensionReason: null } });
    await logAdminAction(admin.id, { action: "store.restore", targetType: "store", targetId: store.id, storeId: store.id }, tx);
  });
  invalidateStorefrontCache(store.id, store.slug);
  revalidatePath("/admin", "layout");
  back(formData, "/admin/boutiques",`${store.name} est rétablie.`);
}

/* ---------- Abonnements ---------- */

export async function extendTrial(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const storeId = id.safeParse(formData.get("storeId"));
  const days = z.coerce.number().int().refine((value) => [7, 14, 30].includes(value)).safeParse(formData.get("days"));
  if (!storeId.success || !days.success) back(formData, "/admin/abonnements", "Choisissez une durée de prolongation.", "erreur");

  const subscription = await prisma.subscription.findUnique({ where: { storeId: storeId.data }, select: { id: true, status: true, trialEndsAt: true, currentPeriodEnd: true, store: { select: { name: true } } } });
  // Seuls les essais (en cours ou expirés sans abonnement payé) peuvent être prolongés.
  if (!subscription || !(subscription.status === "TRIAL" || (subscription.status === "EXPIRED" && !subscription.currentPeriodEnd))) {
    back(formData, "/admin/abonnements", "Seul un essai peut être prolongé.", "erreur");
  }
  const start = subscription.trialEndsAt > new Date() ? subscription.trialEndsAt : new Date();
  const trialEndsAt = new Date(start.getTime() + days.data * 86_400_000);
  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({ where: { id: subscription.id }, data: { status: "TRIAL", trialEndsAt } });
    await logAdminAction(admin.id, { action: "subscription.extend-trial", targetType: "subscription", targetId: subscription.id, storeId: storeId.data, details: { days: days.data, trialEndsAt: trialEndsAt.toISOString() } }, tx);
  });
  revalidatePath("/admin", "layout");
  back(formData, "/admin/abonnements", `Essai de ${subscription.store.name} prolongé de ${days.data} jours.`);
}

/* ---------- Messages échoués ---------- */

/** E22 : prévient les propriétaires que des messages n'ont pas pu partir (sans numéro ni contenu). */
export async function notifyFailedMessages(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const storeId = id.safeParse(formData.get("storeId"));
  const label = z.string().trim().min(2).max(60).safeParse(formData.get("reasonLabel"));
  const count = z.coerce.number().int().min(1).max(10_000).safeParse(formData.get("count"));
  if (!storeId.success || !label.success || !count.success) back(formData, "/admin/messages", "Demande invalide.", "erreur");
  const store = await prisma.store.findUnique({ where: { id: storeId.data }, select: { name: true, memberships: { where: { role: "OWNER" }, select: { user: { select: { email: true } } } } } });
  if (!store) back(formData, "/admin/messages", "Boutique introuvable.", "erreur");

  for (const owner of store.memberships) {
    await sendEmailQuietly("E22", owner.user.email, { nombre: String(count.data), raison: label.data.toLocaleLowerCase("fr-FR") }, appUrl("/dashboard/messages"));
  }
  await logAdminAction(admin.id, { action: "messages.notify-owner", targetType: "store", targetId: storeId.data, storeId: storeId.data, details: { count: count.data, reason: label.data } });
  back(formData, "/admin/messages", `Le propriétaire de ${store.name} a été prévenu par e-mail.`);
}

/* ---------- Alertes ---------- */

async function closeAlerts(adminId: string, keys: string[], status: "RESOLVED" | "IGNORED") {
  const alerts = (await computeAlerts()).filter((alert) => keys.includes(alert.key));
  for (const alert of alerts) {
    const data = { status, level: alert.kind, title: alert.title.slice(0, 200), body: alert.body.slice(0, 500), updatedById: adminId };
    await prisma.adminAlertState.upsert({ where: { key: alert.key }, create: { key: alert.key, ...data }, update: data });
    await logAdminAction(adminId, { action: status === "IGNORED" ? "alert.ignore" : "alert.resolve", targetType: "alert", targetId: alert.key.slice(0, 60), details: { key: alert.key } });
  }
  return alerts.length;
}

export async function updateAlert(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const key = z.string().min(3).max(160).safeParse(formData.get("key"));
  const status = formData.get("status") === "IGNORED" ? "IGNORED" : "RESOLVED";
  if (!key.success) back(formData, "/admin/alertes", "Alerte introuvable.", "erreur");
  const closed = await closeAlerts(admin.id, [key.data], status);
  revalidatePath("/admin", "layout");
  if (!closed) back(formData, "/admin/alertes", "Cette alerte n’est plus d’actualité.", "erreur");
  back(formData, "/admin/alertes", status === "IGNORED" ? "Alerte ignorée." : "Alerte marquée comme traitée.");
}

export async function resolveAllAlerts(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const open = await listOpenAlerts();
  const closed = await closeAlerts(admin.id, open.map((alert) => alert.key), "RESOLVED");
  revalidatePath("/admin", "layout");
  back(formData, "/admin/alertes", closed ? `${closed} alerte(s) marquée(s) comme traitée(s).` : "Aucune alerte ouverte.");
}

/** « Renvoyer l'e-mail de vérification » d'une alerte « e-mail non vérifié » ; l'alerte passe en traitée. */
export async function resendVerificationEmail(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const userId = id.safeParse(formData.get("userId"));
  if (!userId.success) back(formData, "/admin/alertes", "Compte introuvable.", "erreur");
  const user = await prisma.user.findUnique({ where: { id: userId.data }, select: { id: true, email: true, emailVerified: true } });
  if (!user) back(formData, "/admin/alertes", "Compte introuvable.", "erreur");
  if (user.emailVerified) back(formData, "/admin/alertes", "Cette adresse est déjà confirmée.", "erreur");
  try {
    await auth.api.sendVerificationEmail({ body: { email: user.email, callbackURL: "/dashboard" } });
  } catch {
    back(formData, "/admin/alertes", "L’e-mail n’a pas pu partir. Vérifiez la configuration des e-mails.", "erreur");
  }
  await logAdminAction(admin.id, { action: "user.resend-verification", targetType: "user", targetId: user.id });
  await closeAlerts(admin.id, [`email-unverified:${user.id}`], "RESOLVED");
  revalidatePath("/admin", "layout");
  back(formData, "/admin/alertes", `E-mail de vérification renvoyé à ${user.email}.`);
}

export async function reopenAlert(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const key = z.string().min(3).max(160).safeParse(formData.get("key"));
  if (!key.success) back(formData, "/admin/alertes", "Alerte introuvable.", "erreur");
  await prisma.adminAlertState.deleteMany({ where: { key: key.data } });
  await logAdminAction(admin.id, { action: "alert.reopen", targetType: "alert", targetId: key.data.slice(0, 60), details: { key: key.data } });
  revalidatePath("/admin", "layout");
  back(formData, "/admin/alertes", "Alerte rouverte.");
}

/* ---------- Utilisateurs ---------- */

export async function sendUserPasswordReset(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const userId = id.safeParse(formData.get("userId"));
  if (!userId.success) back(formData, "/admin/utilisateurs", "Compte introuvable.", "erreur");
  const user = await prisma.user.findUnique({ where: { id: userId.data }, select: { id: true, email: true, suspendedAt: true } });
  if (!user) back(formData, "/admin/utilisateurs", "Compte introuvable.", "erreur");
  if (user.suspendedAt) back(formData, "/admin/utilisateurs", "Rétablissez d’abord l’accès de ce compte.", "erreur");

  try {
    await auth.api.requestPasswordReset({ body: { email: user.email, redirectTo: "/reinitialiser" } });
  } catch {
    back(formData, "/admin/utilisateurs", "Le lien n’a pas pu être envoyé. Vérifiez la configuration des e-mails.", "erreur");
  }
  await logAdminAction(admin.id, { action: "user.password-reset-link", targetType: "user", targetId: user.id });
  back(formData, "/admin/utilisateurs", `Lien de réinitialisation envoyé à ${user.email}.`);
}

export async function suspendUser(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const userId = id.safeParse(formData.get("userId"));
  const motif = reason.safeParse(formData.get("reason"));
  if (!userId.success) back(formData, "/admin/utilisateurs", "Compte introuvable.", "erreur");
  if (!motif.success) back(formData, "/admin/utilisateurs", motif.error.issues[0]?.message ?? "Motif invalide.", "erreur");
  if (userId.data === admin.id) back(formData, "/admin/utilisateurs", "Vous ne pouvez pas suspendre votre propre compte.", "erreur");
  const user = await prisma.user.findUnique({ where: { id: userId.data }, select: { id: true, name: true, platformRole: true, suspendedAt: true } });
  if (!user) back(formData, "/admin/utilisateurs", "Compte introuvable.", "erreur");
  if (isAdminRole(user.platformRole)) back(formData, "/admin/utilisateurs", "Un administrateur ne peut pas être suspendu depuis cet écran.", "erreur");
  if (user.suspendedAt) back(formData, "/admin/utilisateurs", `${user.name} est déjà suspendu(e).`, "erreur");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { suspendedAt: new Date(), suspensionReason: motif.data } });
    // Déconnexion immédiate sur tous les appareils.
    await tx.session.deleteMany({ where: { userId: user.id } });
    await logAdminAction(admin.id, { action: "user.suspend", targetType: "user", targetId: user.id, details: { reason: motif.data } }, tx);
  });
  revalidatePath("/admin", "layout");
  back(formData, "/admin/utilisateurs", `Accès de ${user.name} suspendu. Ses sessions ont été fermées.`);
}

export async function restoreUser(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const userId = id.safeParse(formData.get("userId"));
  if (!userId.success) back(formData, "/admin/utilisateurs", "Compte introuvable.", "erreur");
  const user = await prisma.user.findUnique({ where: { id: userId.data }, select: { id: true, name: true, suspendedAt: true } });
  if (!user?.suspendedAt) back(formData, "/admin/utilisateurs", "Ce compte n’est pas suspendu.", "erreur");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { suspendedAt: null, suspensionReason: null } });
    await logAdminAction(admin.id, { action: "user.restore", targetType: "user", targetId: user.id }, tx);
  });
  revalidatePath("/admin", "layout");
  back(formData, "/admin/utilisateurs", `Accès de ${user.name} rétabli.`);
}
