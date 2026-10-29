import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EmailConfirmPanel } from "@/components/auth/email-confirm-panel";
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell";
import { auth } from "@/modules/auth/server";

export const metadata: Metadata = { title: "Confirmer mon adresse e-mail", robots: { index: false } };

/** Confirmation de l'adresse d'un compte déjà connecté (bandeau du tableau de bord). */
export default async function ConfirmEmailPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion?next=/confirmer-adresse");
  if (session.user.emailVerified) redirect("/dashboard");

  return (
    <AuthShell>
      <AuthHeading subtitle="Un code à 6 chiffres suffit : il arrive en quelques secondes dans votre boîte e-mail." title="Confirmez votre adresse e-mail" />
      <EmailConfirmPanel doneHref="/dashboard" email={session.user.email} />
    </AuthShell>
  );
}
