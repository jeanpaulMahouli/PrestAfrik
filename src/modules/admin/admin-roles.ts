"use server";

import type { PlatformRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminRole, logAdminAction, requireSuperAdmin } from "@/modules/admin/context";
import { adminRoleDescriptions as roleDescriptions, adminRoleLabels } from "@/modules/admin/roles";
import { sendEmailQuietly } from "@/modules/email/server";

// Droits d'administration (réservé aux super administrateurs). Garde-fous : impossible de modifier ses
// propres droits, impossible de retirer le dernier super administrateur, confirmation obligatoire,
// chaque changement est journalisé.

const page = "/admin/administrateurs";
const appUrl = (path: string) => new URL(path, process.env.BETTER_AUTH_URL ?? "http://localhost:3000").toString();
const roleSchema = z.enum(["ADMIN", "SUPER_ADMIN"], { error: "Choisissez un rôle." });
const confirmed = (formData: FormData) => formData.get("confirmation") === "on";

function back(message: string, kind: "succes" | "erreur" = "succes"): never {
  redirect(`${page}?${kind}=${encodeURIComponent(message)}`);
}

async function lastSuperAdminGuard(targetRole: PlatformRole, nextRole: PlatformRole) {
  if (targetRole !== "SUPER_ADMIN" || nextRole === "SUPER_ADMIN") return;
  const superAdmins = await prisma.user.count({ where: { platformRole: "SUPER_ADMIN", suspendedAt: null } });
  if (superAdmins <= 1) back("Impossible : c’est le dernier super administrateur. Nommez-en un autre d’abord.", "erreur");
}

/** Donne les droits d'administration à un compte existant (recherche par e-mail). */
export async function grantAdminRole(formData: FormData) {
  const superAdmin = await requireSuperAdmin();
  const email = z.string().trim().toLowerCase().email("Indiquez une adresse e-mail valide.").safeParse(formData.get("email"));
  const role = roleSchema.safeParse(formData.get("role"));
  if (!email.success) back(email.error.issues[0]?.message ?? "Adresse invalide.", "erreur");
  if (!role.success) back("Choisissez un rôle.", "erreur");
  if (!confirmed(formData)) back("Cochez la case de confirmation pour donner ces droits.", "erreur");
  const user = await prisma.user.findUnique({ where: { email: email.data }, select: { id: true, name: true, email: true, platformRole: true, suspendedAt: true } });
  if (!user) back(`Aucun compte avec l’adresse ${email.data}. La personne doit d’abord s’inscrire sur PrestAfrik.`, "erreur");
  if (user.id === superAdmin.id) back("Vous ne pouvez pas modifier vos propres droits.", "erreur");
  if (user.suspendedAt) back(`${user.name} est suspendu(e) : rétablissez d’abord son accès.`, "erreur");
  if (user.platformRole === role.data) back(`${user.name} est déjà ${adminRoleLabels[role.data].toLowerCase()}.`, "erreur");
  await lastSuperAdminGuard(user.platformRole, role.data);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { platformRole: role.data } });
    await logAdminAction(superAdmin.id, { action: isAdminRole(user.platformRole) ? "user.change-admin-role" : "user.promote-admin", targetType: "user", targetId: user.id, details: { from: user.platformRole, to: role.data } }, tx);
  });
  await sendEmailQuietly(
    "E26",
    user.email,
    { prenom: user.name.split(/\s+/)[0], auteur: superAdmin.name, role: adminRoleLabels[role.data].toLowerCase(), droits: roleDescriptions[role.data] },
    appUrl("/admin"),
  );
  revalidatePath(page);
  back(`${user.name} est maintenant ${adminRoleLabels[role.data].toLowerCase()}. Un e-mail l’a prévenu(e).`);
}

/** Retire les droits d'administration d'un compte. */
export async function revokeAdminRole(formData: FormData) {
  const superAdmin = await requireSuperAdmin();
  const userId = z.string().min(10).max(64).safeParse(formData.get("userId"));
  if (!userId.success) back("Compte introuvable.", "erreur");
  if (!confirmed(formData)) back("Cochez la case de confirmation pour retirer ces droits.", "erreur");
  if (userId.data === superAdmin.id) back("Vous ne pouvez pas retirer vos propres droits.", "erreur");
  const user = await prisma.user.findUnique({ where: { id: userId.data }, select: { id: true, name: true, platformRole: true } });
  if (!user || !isAdminRole(user.platformRole)) back("Ce compte n’est pas administrateur.", "erreur");
  await lastSuperAdminGuard(user.platformRole, "USER");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { platformRole: "USER" } });
    await logAdminAction(superAdmin.id, { action: "user.demote-admin", targetType: "user", targetId: user.id, details: { from: user.platformRole, to: "USER" } }, tx);
  });
  revalidatePath(page);
  back(`${user.name} n’a plus accès à l’administration.`);
}
