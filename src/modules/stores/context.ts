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

/** Contexte vendeur de la requête (mémoïsé : le shell et la page partagent la même lecture). */
export const getStoreContext = cache(async function getStoreContext() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/connexion");

  const cookieStore = await cookies();
  const requestedStoreId = cookieStore.get("prestafrik-store")?.value;
  const memberships = await prisma.storeMembership.findMany({
    where: { userId: session.user.id },
    include: { store: true },
    orderBy: { createdAt: "asc" },
  });

  const preferredMembership = findAuthorizedMembership(
    memberships.map(({ storeId, userId, role }) => ({ storeId, userId, role })),
    session.user.id,
    requestedStoreId,
  );
  const selected =
    (preferredMembership &&
      memberships.find(({ storeId }) => storeId === preferredMembership.storeId)) ??
    memberships[0];
  if (!selected) redirect("/boutiques/nouvelle");

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
    throw new Error("Tu n’as pas l’autorisation d’effectuer cette action.");
  }
  return context;
}
