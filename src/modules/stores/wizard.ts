import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireWhatsappNumber } from "@/modules/auth/google";
import { prisma } from "@/lib/prisma";
import { auth } from "@/modules/auth/server";
import { isAccountVerified } from "@/modules/auth/phone-account";

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
  await requireWhatsappNumber(session.user);
  return session;
}

/**
 * Session d'un compte confirmé (numéro WhatsApp vérifié à l'inscription, ou adresse e-mail confirmée pour
 * les anciens comptes) : obligatoire pour enregistrer une étape ou créer la boutique.
 * Sans confirmation, l'assistant affiche l'écran « Confirmez votre adresse e-mail ».
 */
export async function requireVerifiedWizardSession() {
  const session = await requireWizardSession();
  if (!isAccountVerified(session.user)) redirect("/boutiques/nouvelle");
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
