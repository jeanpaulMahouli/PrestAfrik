import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/modules/auth/server";

export const wizardSteps = [
  "Nom",
  "Activité",
  "Localisation",
  "Coordonnées",
  "Thème",
  "Couleurs et logo",
  "Premier produit",
  "Publication",
] as const;

export const wizardStepCount = wizardSteps.length;

/** Session obligatoire pour l'assistant. */
export async function requireWizardSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion?next=/boutiques/nouvelle");
  return session;
}

/** Boutique que l'utilisateur peut configurer : il doit en être propriétaire. */
export async function findOwnedStore(userId: string, storeId: string) {
  return prisma.store.findFirst({
    where: { id: storeId, memberships: { some: { userId, role: "OWNER" } } },
    include: { whatsappSettings: true, activity: { select: { label: true } } },
  });
}

export type WizardStore = NonNullable<Awaited<ReturnType<typeof findOwnedStore>>>;

/**
 * Boutique à reprendre : celle demandée, sinon la première dont l'assistant n'est pas terminé.
 * `nouvelle=1` force la création d'une nouvelle boutique.
 */
export async function resolveWizardStore(userId: string, params: { boutique?: string; nouvelle?: string }) {
  if (params.nouvelle === "1") return null;
  if (params.boutique) return findOwnedStore(userId, params.boutique);
  const inProgress = await prisma.store.findFirst({
    where: { onboardingStep: { not: null }, memberships: { some: { userId, role: "OWNER" } } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return inProgress ? findOwnedStore(userId, inProgress.id) : null;
}
