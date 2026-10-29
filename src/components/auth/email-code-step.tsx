"use client";

import "@/styles/auth.css";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { texts } from "@/config/texts";
import { authClient } from "@/modules/auth/client";

/** Délai avant de pouvoir redemander un code (le serveur limite aussi les envois). */
export const emailCodeResendDelayMs = 60_000;

type EmailCodeStepProps = {
  email: string;
  /** Heure (ms) à partir de laquelle un nouveau code peut être demandé. */
  resendAt: number;
  onResent: (resendAt: number) => void;
  /** Code accepté : la session est ouverte, l'appelant redirige. */
  onVerified: () => void;
  /** Revenir au formulaire (adresse mal saisie) ; absent quand l'adresse ne peut pas changer ici. */
  onChangeEmail?: () => void;
  submitLabel?: string;
  /** Contexte : inscription, ou connexion d'un compte dont l'adresse n'est pas encore confirmée. */
  intro?: string;
};

function codeErrorMessage(error: { status?: number; code?: string; message?: string }) {
  if (error.status === 429) return texts.auth.signIn.tooManyAttempts;
  switch (error.code) {
    case "INVALID_OTP":
      return "Code incorrect. Vérifiez l’e-mail reçu et réessayez.";
    case "OTP_EXPIRED":
      return "Ce code a expiré. Demandez-en un nouveau ci-dessous.";
    case "TOO_MANY_ATTEMPTS":
      return "Trop d’essais avec ce code. Demandez-en un nouveau ci-dessous.";
    default:
      return texts.common.genericError;
  }
}

/** Saisie du code à 6 chiffres reçu par e-mail : vérification, renvoi après un délai, adresse modifiable. */
export function EmailCodeStep({ email, resendAt, onResent, onVerified, onChangeEmail, submitLabel = "Valider et terminer mon inscription", intro }: EmailCodeStepProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    inputRef.current?.focus();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== 6 || pending) return;
    setError("");
    setInfo("");
    setPending(true);
    try {
      const result = await authClient.emailOtp.verifyEmail({ email, otp: code });
      if (result.error) {
        setError(codeErrorMessage(result.error));
        inputRef.current?.select();
        setPending(false);
        return;
      }
      onVerified();
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez votre connexion et réessayez : votre code reste valable.");
      setPending(false);
    }
  }

  async function resend() {
    setError("");
    setInfo("");
    setResending(true);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
      if (result.error) {
        setError(result.error.status === 429 ? "Trop de codes demandés. Patientez quelques minutes avant de réessayer." : texts.common.genericError);
        return;
      }
      setCode("");
      onResent(Date.now() + emailCodeResendDelayMs);
      setInfo(`Un nouveau code a été envoyé à ${email}. L’ancien code ne fonctionne plus.`);
      inputRef.current?.focus();
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form aria-busy={pending} className="auth-form" noValidate onSubmit={submit}>
      <div className="auth-otp-intro auth-otp-intro-email" role="status">
        <span aria-hidden="true" className="auth-otp-icon">
          <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
            <rect height="16" rx="2" width="20" x="2" y="4" />
            <path d="m22 7-10 6L2 7" />
          </svg>
        </span>
        <p>
          {intro ?? "Dernière étape !"} Nous avons envoyé un code à 6 chiffres à <strong>{email}</strong>. Pensez à regarder dans les courriers indésirables (spam).
        </p>
      </div>

      <div className="auth-field">
        <label htmlFor={`${id}-code`}>Code reçu par e-mail</label>
        <div className={`auth-input auth-otp-input ${error ? "is-invalid" : code.length === 6 ? "is-valid" : ""}`}>
          <input
            aria-describedby={`${id}-code-help`}
            aria-invalid={Boolean(error) || undefined}
            autoComplete="one-time-code"
            id={`${id}-code`}
            inputMode="numeric"
            maxLength={6}
            name="code"
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            pattern="\d{6}"
            placeholder="••••••"
            ref={inputRef}
            value={code}
          />
        </div>
        <p aria-live="polite" className={error ? "auth-field-error" : "auth-field-help"} id={`${id}-code-help`}>
          {error || "Le code est valable 10 minutes."}
        </p>
      </div>

      {info && <p className="auth-notice" role="status">{info}</p>}

      <SubmitButton className="auth-submit" disabled={code.length !== 6} loading={pending} pendingLabel="Vérification…">
        {submitLabel}
      </SubmitButton>

      <div className="auth-otp-actions">
        <button className="auth-link-button" disabled={resendIn > 0 || resending} onClick={resend} type="button">
          {resending ? "Envoi du code…" : resendIn > 0 ? `Renvoyer le code dans ${resendIn} s` : "Je n’ai rien reçu : renvoyer le code"}
        </button>
        {onChangeEmail && (
          <button className="auth-link-button" onClick={onChangeEmail} type="button">
            Modifier l’adresse e-mail
          </button>
        )}
      </div>
    </form>
  );
}
