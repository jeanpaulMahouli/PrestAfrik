import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell";
import { texts } from "@/config/texts";
import { googleSignInEnabled } from "@/modules/auth/google";

const t = texts.auth.signIn;

export const metadata: Metadata = { title: t.metaTitle };

export default async function SignInPage({ searchParams }: PageProps<"/connexion">) {
  const params = await searchParams;
  const value = (key: string) => {
    const raw = params[key];
    return typeof raw === "string" ? raw : undefined;
  };
  const notice =
    value("motDePasseModifie") === "1" ? t.passwordChanged : value("verifiee") === "1" ? t.emailVerified : null;
  const error =
    value("erreur") === "invitation-invalide"
      ? t.invitationInvalid
      : value("erreur") === "invitation-expiree"
        ? t.invitationExpired
        : value("erreur") === "google"
          ? t.googleError
          : null;

  return (
    <AuthShell>
      <AuthHeading subtitle={t.subtitle} title={t.title} />
      {notice && <p className="auth-notice" role="status">{notice}</p>}
      {error && <p className="auth-alert" role="alert">{error}</p>}
      <AuthForm googleEnabled={googleSignInEnabled()} invitationToken={value("invitation")} mode="sign-in" next={value("next")} />
    </AuthShell>
  );
}
