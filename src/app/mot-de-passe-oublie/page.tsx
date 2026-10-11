import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordResetRequestForm } from "@/components/auth/password-reset-request-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      heading="Réinitialise ton mot de passe"
      message="On va t’aider à retrouver l’accès à ton compte."
    >
      <PasswordResetRequestForm />
      <p className="auth-footer">
        <Link className="text-link" href="/connexion">
          Retour à la connexion
        </Link>
      </p>
    </AuthShell>
  );
}
