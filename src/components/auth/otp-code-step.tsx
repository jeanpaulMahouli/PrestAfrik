"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { callWhatsappAuth } from "@/components/auth/auth-phone-field";

export type CodeRequest = { phoneNumber: string; maskedPhone: string; expiresAt: string; resendAt: string };

type OtpCodeStepProps = {
  request: CodeRequest;
  /** « sign-up » ou « password » : point d'accès du renvoi et du suivi de distribution. */
  purpose: "sign-up" | "password";
  submitLabel: string;
  pendingLabel: string;
  /** Vérifie le code ; renvoie un message d'erreur à afficher, ou null si c'est bon (l'appelant enchaîne). */
  onSubmit: (code: string) => Promise<string | null>;
  onResent: (request: CodeRequest) => void;
  onChangeNumber: () => void;
  /** Champs supplémentaires (ex. nouveau mot de passe). */
  children?: ReactNode;
  canSubmit?: boolean;
};

const secondsUntil = (iso: string, now: number) => Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000));

/** Saisie du code reçu sur WhatsApp : 6 chiffres, renvoi après un délai, numéro modifiable, statut de distribution. */
export function OtpCodeStep({ request, purpose, submitLabel, pendingLabel, onSubmit, onResent, onChangeNumber, children, canSubmit = true }: OtpCodeStepProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [delivery, setDelivery] = useState<string | null>(null);
  const digits = code.replace(/\D/g, "");
  const resendIn = secondsUntil(request.resendAt, now);
  const expired = secondsUntil(request.expiresAt, now) === 0;

  useEffect(() => {
    inputRef.current?.focus();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Statut transmis par Meta (webhook) : prévient si le message n'a pas pu être distribué.
  useEffect(() => {
    let stopped = false;
    let tries = 0;
    setDelivery(null);
    const poll = async () => {
      tries += 1;
      const result = await callWhatsappAuth<{ status: string | null }>("delivery", { phoneNumber: request.phoneNumber, purpose }).catch(() => null);
      if (stopped || !result?.ok) return;
      setDelivery(result.data.status);
      if (result.data.status !== "failed" && result.data.status !== "delivered" && result.data.status !== "read" && tries < 8) window.setTimeout(poll, 5000);
    };
    const first = window.setTimeout(poll, 4000);
    return () => {
      stopped = true;
      window.clearTimeout(first);
    };
  }, [request, purpose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (digits.length !== 6 || !canSubmit || pending) return;
    setError("");
    setInfo("");
    setPending(true);
    try {
      const message = await onSubmit(digits);
      if (message) {
        setError(message);
        inputRef.current?.select();
      }
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez votre connexion et réessayez : votre code reste valable.");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setError("");
    setInfo("");
    setResending(true);
    try {
      const result = await callWhatsappAuth<CodeRequest & { sent: boolean }>(`${purpose === "sign-up" ? "sign-up" : "password"}/resend`, { phoneNumber: request.phoneNumber });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setCode("");
      onResent(result.data);
      setInfo(`Un nouveau code a été envoyé sur WhatsApp au ${result.data.maskedPhone}. L’ancien code ne fonctionne plus.`);
      inputRef.current?.focus();
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form aria-busy={pending} className="auth-form" noValidate onSubmit={submit}>
      <div className="auth-otp-intro" role="status">
        <span aria-hidden="true" className="auth-otp-icon">
          <svg fill="currentColor" height="22" viewBox="0 0 24 24" width="22"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 .9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z" /></svg>
        </span>
        <p>
          Nous avons envoyé un code à 6 chiffres sur WhatsApp au <strong>{request.maskedPhone}</strong>. Ouvrez WhatsApp : le message vient de <strong>PrestAfrik</strong>.
        </p>
      </div>

      <div className="auth-field">
        <label htmlFor={`${id}-code`}>Code reçu sur WhatsApp</label>
        <div className={`auth-input auth-otp-input ${error ? "is-invalid" : digits.length === 6 ? "is-valid" : ""}`}>
          <input
            aria-describedby={`${id}-code-help`}
            aria-invalid={Boolean(error) || undefined}
            autoComplete="one-time-code"
            id={`${id}-code`}
            inputMode="numeric"
            maxLength={7}
            name="code"
            onChange={(event) => {
              setCode(event.target.value.replace(/[^\d]/g, "").slice(0, 6));
              setError("");
            }}
            pattern="\d{6}"
            placeholder="••••••"
            ref={inputRef}
            value={digits}
          />
        </div>
        <p aria-live="polite" className={error ? "auth-field-error" : "auth-field-help"} id={`${id}-code-help`}>
          {error || (expired ? "Ce code a expiré : demandez-en un nouveau ci-dessous." : `Le code est valable 10 minutes.`)}
        </p>
      </div>

      {children}

      {delivery === "failed" && (
        <p className="auth-alert" role="alert">
          WhatsApp n’a pas pu distribuer le message à ce numéro. Vérifiez qu’il utilise bien WhatsApp, puis renvoyez le code ou modifiez le numéro.
        </p>
      )}
      {info && <p className="auth-notice" role="status">{info}</p>}

      <SubmitButton className="auth-submit" disabled={digits.length !== 6 || !canSubmit} loading={pending} pendingLabel={pendingLabel}>
        {submitLabel}
      </SubmitButton>

      <div className="auth-otp-actions">
        <button className="auth-link-button" disabled={resendIn > 0 || resending} onClick={resend} type="button">
          {resending ? "Envoi du code…" : resendIn > 0 ? `Renvoyer le code dans ${resendIn} s` : "Je n’ai rien reçu : renvoyer le code"}
        </button>
        <button className="auth-link-button" onClick={onChangeNumber} type="button">
          Modifier le numéro
        </button>
      </div>
    </form>
  );
}
