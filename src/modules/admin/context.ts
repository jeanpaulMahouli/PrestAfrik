import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/modules/auth/server";

/**
 * Administrateur PrestAfrik connecté (rôle plateforme ADMIN, relu en base à chaque requête).
 * Un vendeur reçoit une page introuvable : l'existence de l'administration n'est pas révélée.
 */
export const requirePlatformAdmin = cache(async function requirePlatformAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, platformRole: true, suspendedAt: true },
  });
  if (!user || user.platformRole !== "ADMIN" || user.suspendedAt) notFound();
  return user;
});

export async function isPlatformAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { platformRole: true, suspendedAt: true } });
  return user?.platformRole === "ADMIN" && !user.suspendedAt;
}

/** Toute action d'administration est journalisée (brief §6.13). */
export function logAdminAction(
  actorId: string,
  entry: { action: string; targetType: "store" | "user" | "subscription" | "alert" | "message"; targetId: string; storeId?: string | null; details?: Prisma.InputJsonValue },
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return client.auditLog.create({
    data: { actorId, action: entry.action, targetType: entry.targetType, targetId: entry.targetId.slice(0, 60), storeId: entry.storeId ?? null, details: entry.details },
  });
}
