import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell";
import { WhatsappNumberForm } from "@/components/auth/whatsapp-number-form";
import { welcomeHref } from "@/config/routes";
import { prisma } from "@/lib/prisma";
import { adoptOwnedStoreWhatsappNumber } from "@/modules/auth/google";
import { auth } from "@/modules/auth/server";

export const metadata: Metadata = { title: "Votre numéro WhatsApp", robots: { index: false } };

/**
 * Numéro WhatsApp obligatoire : dernière étape d'une inscription avec Google, et passage obligé pour un compte
 * qui n'en a pas encore (le tableau de bord et l'assistant y renvoient tant qu'il manque).
 */
export default async function WhatsappStepPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");
  if (session.user.phoneNumber) redirect("/dashboard");
  // Sa propre boutique a déjà un numéro WhatsApp : il devient celui du compte, rien à saisir.
  if (await adoptOwnedStoreWhatsappNumber(session.user.id)) redirect("/dashboard");

  const firstName = session.user.name.trim().split(/\s+/)[0] || session.user.name;
  // Compte déjà installé (boutique existante) : retour au tableau de bord, sans l'accueil des nouveaux inscrits.
  const hasStore = (await prisma.storeMembership.count({ where: { userId: session.user.id } })) > 0;
  return (
    <AuthShell>
      <AuthHeading
        subtitle={
          hasStore
            ? "Votre compte n’a pas encore de numéro WhatsApp. Il est obligatoire : vos clients vous écriront et vous enverront leurs commandes sur ce numéro."
            : "Dernière étape, et elle est obligatoire : vos clients vous écriront et vous enverront leurs commandes sur ce numéro."
        }
        title={hasStore ? `${firstName}, votre numéro WhatsApp ?` : `Bienvenue ${firstName} ! Votre numéro WhatsApp ?`}
      />
      <WhatsappNumberForm next={hasStore ? "/dashboard" : welcomeHref} />
    </AuthShell>
  );
}
