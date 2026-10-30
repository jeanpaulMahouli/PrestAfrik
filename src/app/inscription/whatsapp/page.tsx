import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell";
import { WhatsappNumberForm } from "@/components/auth/whatsapp-number-form";
import { welcomeHref } from "@/config/routes";
import { auth } from "@/modules/auth/server";

export const metadata: Metadata = { title: "Votre numéro WhatsApp", robots: { index: false } };

/** Dernière étape d'une inscription avec Google : le numéro WhatsApp, indispensable pour recevoir les commandes. */
export default async function WhatsappStepPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");
  if (session.user.phoneNumber) redirect("/dashboard");

  const firstName = session.user.name.trim().split(/\s+/)[0] || session.user.name;
  return (
    <AuthShell>
      <AuthHeading
        subtitle="Dernière étape, et elle est importante : vos clients vous écriront et vous enverront leurs commandes sur ce numéro."
        title={`Bienvenue ${firstName} ! Votre numéro WhatsApp ?`}
      />
      <WhatsappNumberForm next={welcomeHref} />
    </AuthShell>
  );
}
