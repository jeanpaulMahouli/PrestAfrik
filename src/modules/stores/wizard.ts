import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireWhatsappNumber } from "@/modules/auth/google";
import { prisma } from "@/lib/prisma";
import { auth } from "@/modules/auth/server";
import { isAccountVerified } from "@/modules/auth/phone-account";

/**
 * Étapes affichées, avec leur numéro interne. Les numéros enregistrés dans les brouillons ne changent pas :
 * les anciennes étapes 4 (« Coordonnées » : le numéro WhatsApp du compte est repris) et 6 (« Thème » :
 * une seule vitrine) sont sautées.
 */
export const wizardStepIds = [1, 2, 3, 5, 7, 8, 9] as const;
export const wizardSteps = ["Nom", "Activité", "Localisation", "Logo et couleurs", "Premier produit", "Livraison", "Publication"] as const;

/** Dernier numéro interne (publication). */
export const wizardStepCount = 9;

/** Étape affichée qui suit (ou correspond à) un numéro interne : 4 → 5, 6 → 7. */
export function visibleWizardStep(step: number) {
  return wizardStepIds.find((id) => id >= step) ?? wizardStepCount;
}

/** Étape suivante après une étape enregistrée. */
export function nextWizardStep(step: number) {
  return visibleWizardStep(step + 1);
}

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
