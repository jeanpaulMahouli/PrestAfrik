import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/modules/auth/server";
import {
  findAuthorizedMembership,
  hasPermission,
  type Permission,
} from "@/modules/auth/permissions";

// Boutique active : le cookie garde le choix de cet appareil pendant la session en cours ; à une nouvelle
// connexion (autre session), on reprend la dernière boutique enregistrée sur le compte (User.lastActiveStoreId),
// quel que soit l'appareil. Une boutique supprimée ou devenue inaccessible renvoie à la première disponible.

export const activeStoreCookie = "prestafrik-store";
const activityWriteIntervalMs = 5 * 60 * 1000;

export const activeStoreCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

/** Valeur du cookie : « {boutique}:{session} », pour ignorer le choix d'une session précédente. */
export function activeStoreCookieValue(storeId: string, sessionId: string) {
  return `${storeId}:${sessionId}`;
}

function readActiveStoreCookie(value: string | undefined, sessionId: string) {
  const [storeId, cookieSession] = (value ?? "").split(":");
  return storeId && cookieSession === sessionId ? storeId : undefined;
}

/** Retient la boutique choisie : sur cet appareil (cookie) et sur le compte (prochaine connexion). */
export async function rememberActiveStore(userId: string, sessionId: string, storeId: string) {
  (await cookies()).set(activeStoreCookie, activeStoreCookieValue(storeId, sessionId), activeStoreCookieOptions);
  await prisma.user.update({ where: { id: userId }, data: { lastActiveStoreId: storeId } });
}

/** Contexte vendeur de la requête (mémoïsé : le shell et la page partagent la même lecture). */
export const getStoreContext = cache(async function getStoreContext() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/connexion");

  const cookieStore = await cookies();
  const [memberships, user] = await Promise.all([
    prisma.storeMembership.findMany({
      where: { userId: session.user.id },
      include: { store: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { lastActiveStoreId: true, lastActiveAt: true } }),
  ]);
  const requestedStoreId =
    readActiveStoreCookie(cookieStore.get(activeStoreCookie)?.value, session.session.id) ?? user?.lastActiveStoreId ?? undefined;

  const identities = memberships.map(({ storeId, userId, role }) => ({ storeId, userId, role }));
  const preferredMembership = requestedStoreId ? findAuthorizedMembership(identities, session.user.id, requestedStoreId) : undefined;
  const selected =
    (preferredMembership &&
      memberships.find(({ storeId }) => storeId === preferredMembership.storeId)) ??
    memberships[0];
  if (!selected) redirect("/boutiques/nouvelle");

  // Boutique retenue absente ou inaccessible : la boutique affichée devient la dernière utilisée.
  // Dernière activité (administration) : écrite au plus une fois toutes les 5 minutes.
  const now = new Date();
  const staleActivity = !user?.lastActiveAt || now.getTime() - user.lastActiveAt.getTime() > activityWriteIntervalMs;
  if (user?.lastActiveStoreId !== selected.storeId || staleActivity) {
    await prisma.user
      .update({
        where: { id: session.user.id },
        data: { lastActiveStoreId: selected.storeId, ...(staleActivity ? { lastActiveAt: now } : {}) },
      })
      .catch(() => undefined);
  }

  return {
    session,
    membership: { storeId: selected.storeId, userId: selected.userId, role: selected.role },
    store: selected.store,
    memberships,
  };
});

export async function requireStorePermission(permission: Permission) {
  const context = await getStoreContext();
  if (!hasPermission(context.membership.role, permission)) {
    // Page explicative plutôt qu'une erreur serveur (ex. un membre invité qui ouvre « Modifier un produit »).
    redirect(`/dashboard/acces-refuse?droit=${encodeURIComponent(permission)}`);
  }
  return context;
}
