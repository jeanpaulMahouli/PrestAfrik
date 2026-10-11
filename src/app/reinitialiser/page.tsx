import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordResetForm } from "@/components/auth/password-reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell
      heading="Choisis un nouveau mot de passe"
      message="Utilise au moins 10 caractères pour protéger ton compte."
    >
      {token ? (
        <PasswordResetForm token={token} />
      ) : (
        <>
          <p className="form-error" role="alert">
            Ce lien est incomplet. Demande un nouveau lien de récupération.
          </p>
          <Link className="text-link" href="/mot-de-passe-oublie">
            Demander un nouveau lien
          </Link>
        </>
      )}
    </AuthShell>
  );
}
