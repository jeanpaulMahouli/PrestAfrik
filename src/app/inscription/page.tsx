import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell";
import { WhatsappSignUpForm } from "@/components/auth/whatsapp-sign-up-form";
import { texts } from "@/config/texts";

const t = texts.auth.signUp;

export const metadata: Metadata = { title: t.metaTitle };

export default async function SignUpPage({ searchParams }: PageProps<"/inscription">) {
  const params = await searchParams;
  const invitationToken = typeof params.invitation === "string" ? params.invitation : undefined;

  return (
    <AuthShell>
      <AuthHeading subtitle={invitationToken ? t.subtitle : t.whatsappSubtitle} title={t.title} />
      {/* Une invitation d'équipe est liée à une adresse e-mail : ce compte se crée donc avec l'e-mail invité. */}
      {invitationToken ? <AuthForm invitationToken={invitationToken} mode="sign-up" /> : <WhatsappSignUpForm />}
    </AuthShell>
  );
}
