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
  "Livraison",
  "Publication",
] as const;

export const wizardStepCount = wizardSteps.length;

/** Session obligatoire pour l'assistant. */
export async function requireWizardSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion?next=/boutiques/nouvelle");
  return session;
}

/**
 * Session avec adresse e-mail confirmée : obligatoire pour enregistrer une étape ou créer la boutique.
 * Sans confirmation, l'assistant affiche l'écran « Confirmez votre adresse e-mail ».
 */
export async function requireVerifiedWizardSession() {
  const session = await requireWizardSession();
  if (!session.user.emailVerified) redirect("/boutiques/nouvelle");
  return session;
}

/** Adresse d'une étape de l'assistant pour un brouillon. */
export function wizardStepHref(draftId: string, step: number) {
  return `/boutiques/nouvelle?brouillon=${draftId}&etape=${step}`;
}

/** Boutique créée (dernier écran de l'assistant) : l'utilisateur doit en être propriétaire. */
export async function findOwnedStore(userId: string, storeId: string) {
  return prisma.store.findFirst({
    where: { id: storeId, memberships: { some: { userId, role: "OWNER" } } },
    select: { id: true, name: true, slug: true, isPublished: true, theme: true, primaryColor: true, secondaryColor: true, accentColor: true, logoUrl: true, city: true, country: true },
  });
}
