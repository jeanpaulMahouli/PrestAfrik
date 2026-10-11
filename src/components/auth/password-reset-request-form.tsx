"use client";

import { useState, type FormEvent } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { authClient } from "@/modules/auth/client";

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const result = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: "/reinitialiser",
      });
      if (result.error) {
        setError(result.error.message ?? "La demande n’a pas pu aboutir.");
        return;
      }
      setSent(true);
    } catch {
      setError("Le service de récupération n’est pas disponible pour le moment.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div>
        <p aria-live="polite" className="notice" role="status">
          Si cette adresse correspond à un compte, un e-mail de récupération vient d’être envoyé.
          Vérifie ta boîte de réception et tes courriers indésirables.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <label className="form-field">
        Adresse e-mail
        <input
          autoComplete="email"
          maxLength={254}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="toi@exemple.com"
          required
          type="email"
          value={email}
        />
      </label>
      {error && (
        <p aria-live="polite" className="form-error" role="alert">
          {error}
        </p>
      )}
      <SubmitButton className="primary-button full-width" loading={pending} pendingLabel="Envoi en cours…">
        Recevoir un lien
      </SubmitButton>
    </form>
  );
}
