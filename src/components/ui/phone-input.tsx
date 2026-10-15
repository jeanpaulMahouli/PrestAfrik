"use client";

import { useId, useMemo, useState } from "react";
import { dialOptionFor, parsePhone, phoneDialOptions } from "@/lib/phone";
import { CheckIcon } from "@/components/ui/icons";

type PhoneInputProps = {
  label: string;
  /** Préfixe des noms de champs envoyés : `${name}Country` et `${name}National`. */
  name: string;
  defaultCountry?: string;
  defaultNational?: string;
  help?: string;
  error?: string;
  required?: boolean;
  /** Prévient le parent quand la validité change (ex. bouton « Commander sur WhatsApp »). */
  onValidityChange?: (valid: boolean, e164: string | null) => void;
};

/** Indicatif (code seul) et numéro national, deux champs séparés (brief §6.3). */
export function PhoneInput({ label, name, defaultCountry = "CM", defaultNational = "", help, error, required = true, onValidityChange }: PhoneInputProps) {
  const id = useId();
  const options = useMemo(() => phoneDialOptions(), []);
  // Un indicatif partagé est représenté par un seul pays de la liste (ex. +1).
  const [country, setCountry] = useState<string>(() => dialOptionFor(defaultCountry).iso);
  const [national, setNational] = useState(defaultNational);
  const [touched, setTouched] = useState(false);
  const result = parsePhone(country, national);
  const showError = (touched && national.length > 0 && !result.ok) || Boolean(error);
  const message = error ?? (!result.ok ? result.message : "");

  const update = (nextCountry: string, nextNational: string) => {
    const next = parsePhone(nextCountry, nextNational);
    onValidityChange?.(next.ok, next.ok ? next.e164 : null);
  };

  return (
    <div className="v-field phone-field">
      <label htmlFor={`${id}-national`}>{label}</label>
      <div className={`phone-input ${showError ? "is-invalid" : result.ok ? "is-valid" : ""}`}>
        <label className="visually-hidden" htmlFor={`${id}-country`}>Indicatif du pays</label>
        <select
          id={`${id}-country`}
          name={`${name}Country`}
          onChange={(event) => {
            setCountry(event.target.value);
            update(event.target.value, national);
          }}
          value={country}
        >
          {options.map((item) => (
            <option key={item.dialCode} value={item.iso}>
              {item.dialCode}
            </option>
          ))}
        </select>
        <input
          aria-describedby={`${id}-message`}
          aria-invalid={showError || undefined}
          autoComplete="tel-national"
          id={`${id}-national`}
          inputMode="tel"
          maxLength={20}
          name={`${name}National`}
          onBlur={() => setTouched(true)}
          onChange={(event) => {
            setNational(event.target.value);
            update(country, event.target.value);
          }}
          placeholder="6 99 00 00 00"
          required={required}
          type="tel"
          value={national}
        />
        {result.ok && <span aria-hidden="true" className="phone-check"><CheckIcon /></span>}
      </div>
      <span className={showError ? "v-field-error" : "v-field-help"} id={`${id}-message`} role={showError ? "alert" : undefined}>
        {showError ? message : help}
      </span>
    </div>
  );
}
