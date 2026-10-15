"use client";

import { useId, useState, type FormEvent } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { texts } from "@/config/texts";
import { authClient } from "@/modules/auth/client";

const t = texts.auth;

export function PasswordResetRequestForm() {
  const id = useId();
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
      // Réponse identique que le compte existe ou non ; seule la limitation de débit est signalée.
      if (result.error?.status === 429) {
        setError(t.signIn.tooManyAttempts);
        return;
      }
      setSent(true);
    } catch {
      setError(texts.common.networkError);
    } finally {
      setPending(false);
    }
  }

  if (sent) return <p className="auth-notice" role="status">{t.reset.requestSent}</p>;

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-field">
        <label htmlFor={id}>{t.fields.email}</label>
        <div className="auth-input">
          <input
            autoCapitalize="none"
            autoComplete="email"
            id={id}
            inputMode="email"
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t.fields.emailPlaceholder}
            required
            type="email"
            value={email}
          />
        </div>
      </div>
      {error && <p className="auth-alert" role="alert">{error}</p>}
      <SubmitButton className="auth-submit" loading={pending} pendingLabel={texts.common.loading}>
        {t.reset.requestSubmit} <span aria-hidden="true">→</span>
      </SubmitButton>
    </form>
  );
}
