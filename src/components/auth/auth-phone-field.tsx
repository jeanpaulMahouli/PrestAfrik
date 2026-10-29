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

/** Numéro WhatsApp de l'inscription : indicatif (Cameroun par défaut) et numéro, validés au fil de la saisie. */
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
