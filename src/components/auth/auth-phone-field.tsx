"use client";

import { useMemo } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { parsePhone, phoneDialOptions } from "@/lib/phone";

type AuthPhoneFieldProps = {
  id: string;
  label: string;
  country: string;
  national: string;
  onCountryChange: (value: string) => void;
  onNationalChange: (value: string) => void;
  onBlur?: () => void;
  /** Afficher l'erreur de format (après la sortie du champ ou l'envoi). */
  showError: boolean;
  help?: string;
  disabled?: boolean;
};

/** Numéro WhatsApp des écrans de connexion : indicatif (Cameroun par défaut) et numéro, validés au fil de la saisie. */
export function AuthPhoneField({ id, label, country, national, onCountryChange, onNationalChange, onBlur, showError, help, disabled }: AuthPhoneFieldProps) {
  const options = useMemo(() => phoneDialOptions(), []);
  const result = parsePhone(country, national);
  const invalid = showError && national.trim().length > 0 && !result.ok;
  const message = invalid && !result.ok ? result.message : result.ok ? "" : help ?? "";

  return (
    <div className="auth-field">
      <label htmlFor={`${id}-national`}>{label}</label>
      <div className={`auth-input auth-phone ${result.ok ? "is-valid" : ""} ${invalid ? "is-invalid" : ""}`}>
        <label className="visually-hidden" htmlFor={`${id}-country`}>Indicatif du pays</label>
        <select disabled={disabled} id={`${id}-country`} name="phoneCountry" onChange={(event) => onCountryChange(event.target.value)} value={country}>
          {options.map((item) => (
            <option key={item.dialCode} value={item.iso}>
              {item.dialCode}
            </option>
          ))}
        </select>
        <input
          aria-describedby={`${id}-message`}
          aria-invalid={invalid || undefined}
          autoComplete="tel-national"
          disabled={disabled}
          id={`${id}-national`}
          inputMode="tel"
          maxLength={20}
          name="phoneNational"
          onBlur={onBlur}
          onChange={(event) => onNationalChange(event.target.value)}
          placeholder="6 99 00 00 00"
          required
          type="tel"
          value={national}
        />
        {result.ok && <span aria-hidden="true" className="auth-input-check"><CheckIcon /></span>}
      </div>
      <p aria-live="polite" className={invalid ? "auth-field-error" : "auth-field-help"} id={`${id}-message`}>
        {message}
      </p>
    </div>
  );
}

/** Appel d'un point d'accès WhatsApp de l'authentification (/api/auth/whatsapp/…). */
export async function callWhatsappAuth<T = Record<string, unknown>>(path: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/auth/whatsapp/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  const data = (await response.json().catch(() => null)) as (T & { code?: string; message?: string; retryAfterSeconds?: number }) | null;
  if (!response.ok) {
    const code = data?.code ?? (response.status === 429 ? "RATE_LIMITED" : "UNKNOWN");
    const message =
      data?.message && code !== "RATE_LIMITED"
        ? data.message
        : response.status === 429
          ? "Trop de tentatives. Patientez quelques minutes avant de réessayer."
          : "Une erreur est survenue. Vos informations sont conservées. Réessayez dans un instant.";
    return { ok: false as const, code, message, retryAfterSeconds: data?.retryAfterSeconds };
  }
  return { ok: true as const, data: data as T };
}
