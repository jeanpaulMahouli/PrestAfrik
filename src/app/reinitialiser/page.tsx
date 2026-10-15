import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell";
import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { texts } from "@/config/texts";

const t = texts.auth;

export const metadata: Metadata = { title: t.reset.newTitle };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reinitialiser">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;

  return (
    <AuthShell storyText={t.signIn.storyText} storyTitle={t.signIn.storyTitle}>
      <AuthHeading subtitle={t.reset.newSubtitle} title={t.reset.newTitle} />
      {!token || params.error === "INVALID_TOKEN" ? (
        <>
          <p className="auth-alert" role="alert">{t.reset.invalidLink}</p>
          <p className="auth-switch">
            <Link href="/mot-de-passe-oublie">{t.reset.requestSubmit}</Link>
          </p>
        </>
      ) : (
        <PasswordResetForm token={token} />
      )}
    </AuthShell>
  );
}
