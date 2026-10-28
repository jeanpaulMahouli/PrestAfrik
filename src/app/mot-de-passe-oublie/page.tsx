import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell";
import { PasswordResetChooser } from "@/components/auth/whatsapp-password-reset";
import { texts } from "@/config/texts";

const t = texts.auth;

export const metadata: Metadata = { title: t.reset.requestTitle };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <AuthHeading subtitle={t.reset.requestSubtitle} title={t.reset.requestTitle} />
      <PasswordResetChooser />
      <p className="auth-switch">
        <Link href="/connexion">{t.reset.backToSignIn}</Link>
      </p>
    </AuthShell>
  );
}
