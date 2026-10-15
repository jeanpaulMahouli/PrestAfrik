import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell";
import { PasswordResetRequestForm } from "@/components/auth/password-reset-request-form";
import { texts } from "@/config/texts";

const t = texts.auth;

export const metadata: Metadata = { title: t.reset.requestTitle };

export default function ForgotPasswordPage() {
  return (
    <AuthShell storyText={t.signIn.storyText} storyTitle={t.signIn.storyTitle}>
      <AuthHeading subtitle={t.reset.requestSubtitle} title={t.reset.requestTitle} />
      <PasswordResetRequestForm />
      <p className="auth-switch">
        <Link href="/connexion">{t.reset.backToSignIn}</Link>
      </p>
    </AuthShell>
  );
}
