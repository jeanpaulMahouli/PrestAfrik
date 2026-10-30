import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { PlatformRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/modules/auth/server";

/** ADMIN et SUPER_ADMIN ouvrent l'administration ; seul SUPER_ADMIN gère les administrateurs. */
export function isAdminRole(role: PlatformRole | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/**
 * Administrateur PrestAfrik connecté (rôle plateforme relu en base à chaque requête).
 * Un vendeur reçoit une page introuvable : l'existence de l'administration n'est pas révélée.
 */
export const requirePlatformAdmin = cache(async function requirePlatformAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, platformRole: true, suspendedAt: true },
  });
  if (!user || !isAdminRole(user.platformRole) || user.suspendedAt) notFound();
  return user;
});

/** Super administrateur : seule personne autorisée à donner ou retirer les droits d'administration. */
export async function requireSuperAdmin() {
  const admin = await requirePlatformAdmin();
  if (admin.platformRole !== "SUPER_ADMIN") notFound();
  return admin;
}

export async function isPlatformAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { platformRole: true, suspendedAt: true } });
  return isAdminRole(user?.platformRole) && !user?.suspendedAt;
}

/** Toute action d'administration est journalisée (brief §6.13). */
export function logAdminAction(
  actorId: string,
  entry: { action: string; targetType: "store" | "user" | "subscription" | "alert" | "message" | "ticket" | "announcement" | "marketplace"; targetId: string; storeId?: string | null; details?: Prisma.InputJsonValue },
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return client.auditLog.create({
    data: { actorId, action: entry.action, targetType: entry.targetType, targetId: entry.targetId.slice(0, 60), storeId: entry.storeId ?? null, details: entry.details },
  });
}
