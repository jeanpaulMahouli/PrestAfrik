import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ motDePasseModifie?: string; erreur?: string; invitation?: string }>;
}) {
  const { motDePasseModifie, erreur, invitation } = await searchParams;
  const message =
    erreur === "invitation-invalide"
      ? "Le lien d’invitation est invalide."
      : erreur === "invitation-expiree"
        ? "Cette invitation est invalide ou expirée. Demande un nouveau lien au propriétaire."
        : undefined;

  return (
    <AuthShell heading="Content de te revoir" message="Connecte-toi pour gérer ta boutique.">
      {motDePasseModifie === "1" && (
        <p className="notice auth-notice" role="status">
          Ton mot de passe a été modifié. Tu peux te connecter.
        </p>
      )}
      {message && <p className="form-error notice-error" role="alert">{message}</p>}
      <AuthForm mode="sign-in" invitationToken={invitation} />
    </AuthShell>
  );
}
