"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { authClient } from "@/modules/auth/client";

export function PasswordResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const values = new FormData(event.currentTarget);
    const password = String(values.get("password"));
    const confirmation = String(values.get("confirmation"));
    if (password !== confirmation) {
      setError("Les deux mots de passe ne sont pas identiques.");
      setPending(false);
      return;
    }

    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        setError(result.error.message ?? "Ce lien n’est plus valide.");
        return;
      }
      router.push("/connexion?motDePasseModifie=1");
    } catch {
      setError("La réinitialisation n’a pas pu aboutir. Demande un nouveau lien.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="form-field">
        Nouveau mot de passe
        <input
          autoComplete="new-password"
          maxLength={128}
          minLength={10}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="form-field">
        Confirme ton mot de passe
        <input
          autoComplete="new-password"
          maxLength={128}
          minLength={10}
          name="confirmation"
          required
          type="password"
        />
      </label>
      {error && (
        <p aria-live="polite" className="form-error" role="alert">
          {error}
        </p>
      )}
      <SubmitButton className="primary-button full-width" loading={pending} pendingLabel="Enregistrement…">
        Enregistrer le nouveau mot de passe
      </SubmitButton>
    </form>
  );
}
