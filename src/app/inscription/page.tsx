import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell";
import { texts } from "@/config/texts";
import { googleSignInEnabled } from "@/modules/auth/google";

const t = texts.auth.signUp;

export const metadata: Metadata = { title: t.metaTitle };

export default async function SignUpPage({ searchParams }: PageProps<"/inscription">) {
  const params = await searchParams;
  const invitationToken = typeof params.invitation === "string" ? params.invitation : undefined;

  return (
    <AuthShell>
      <AuthHeading subtitle={t.subtitle} title={t.title} />
      {/* Offre de lancement : 6 mois d'abonnement offerts (config/pricing.ts). */}
      {!invitationToken && (
        <p className="auth-offer">
          <span aria-hidden="true">🎁</span>
          <span>
            <strong>{t.offerTitle}</strong>
            {t.offerText}
          </span>
        </p>
      )}
      <AuthForm googleEnabled={googleSignInEnabled()} invitationToken={invitationToken} mode="sign-up" />
    </AuthShell>
  );
}
