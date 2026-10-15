"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { texts } from "@/config/texts";
import { authClient } from "@/modules/auth/client";
import { checkAccountForReset } from "@/modules/auth/password-reset-actions";

const t = texts.auth;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function PasswordResetRequestForm() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [unknown, setUnknown] = useState(false);
  const [pending, setPending] = useState(false);
  const normalized = email.trim().toLowerCase();
  const valid = emailPattern.test(normalized);

  async function send() {
    setError("");
    setUnknown(false);
    setPending(true);
    try {
      // Le compte est vérifié avant l'envoi : une adresse inconnue est signalée tout de suite.
      const check = await checkAccountForReset(normalized);
      if (!check.ok) {
        if (check.reason === "unknown") setUnknown(true);
        else setError(check.reason === "tooMany" ? t.signIn.tooManyAttempts : t.fields.emailInvalid);
        return;
      }
      const result = await authClient.requestPasswordReset({ email: normalized, redirectTo: "/reinitialiser" });
      if (result.error) {
        setError(result.error.status === 429 ? t.signIn.tooManyAttempts : texts.common.genericError);
        return;
      }
      setSentTo(normalized);
    } catch {
      setError(texts.common.networkError);
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (valid) void send();
  }

  if (sentTo) {
    const [before, after] = t.reset.requestSent.split("{email}");
    return (
      <div className="auth-notice" role="status">
        <strong>{t.reset.requestSentTitle}</strong>
        <p>
          {before}
          <strong>{sentTo}</strong>
          {after}
        </p>
        <button className="auth-link-button" disabled={pending} onClick={() => void send()} type="button">
          {pending ? texts.common.loading : t.reset.requestResend}
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" noValidate onSubmit={submit}>
      <div className="auth-field">
        <label htmlFor={id}>{t.fields.email}</label>
        <div className={`auth-input ${valid ? "is-valid" : ""} ${unknown ? "is-invalid" : ""}`}>
          <input
            aria-describedby={`${id}-help`}
            aria-invalid={unknown || undefined}
            autoCapitalize="none"
            autoComplete="email"
            id={id}
            inputMode="email"
            maxLength={254}
            onChange={(event) => {
              setEmail(event.target.value);
              setUnknown(false);
            }}
            placeholder={t.fields.emailPlaceholder}
            required
            spellCheck={false}
            type="email"
            value={email}
          />
        </div>
        <p aria-live="polite" className={unknown ? "auth-field-error" : "auth-field-help"} id={`${id}-help`}>
          {unknown ? (
            <>
              {t.reset.unknownAccount} <Link href="/inscription">{t.reset.createAccount}</Link>
            </>
          ) : valid ? "" : t.reset.requestHint}
        </p>
      </div>
      {error && <p className="auth-alert" role="alert">{error}</p>}
      <SubmitButton className="auth-submit" disabled={!valid || unknown} loading={pending} pendingLabel={texts.common.loading}>
        {t.reset.requestSubmit} <span aria-hidden="true">→</span>
      </SubmitButton>
    </form>
  );
}
