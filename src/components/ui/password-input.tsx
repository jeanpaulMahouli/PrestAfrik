"use client";

import { useEffect, useId, useState, type InputHTMLAttributes } from "react";
import { texts } from "@/config/texts";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Repasse le champ en mode masqué (par exemple après l'envoi du formulaire). */
  resetSignal?: number;
};

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M3 3l18 18" />}
    </svg>
  );
}

/** Champ mot de passe avec l'icône œil seule (brief §6.1). */
export function PasswordInput({ className, id, resetSignal, ...props }: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const label = visible ? texts.auth.fields.hidePassword : texts.auth.fields.showPassword;

  useEffect(() => setVisible(false), [resetSignal]);

  useEffect(() => {
    if (!visible) return;
    let timer: number | undefined;
    const onVisibility = () => {
      window.clearTimeout(timer);
      if (document.hidden) timer = window.setTimeout(() => setVisible(false), 30_000);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [visible]);

  return (
    <div className={`password-input ${className ?? ""}`}>
      <input
        {...props}
        autoCapitalize="off"
        autoCorrect="off"
        id={inputId}
        spellCheck={false}
        type={visible ? "text" : "password"}
      />
      <button
        aria-controls={inputId}
        aria-label={label}
        aria-pressed={visible}
        className="password-toggle"
        onClick={() => setVisible((value) => !value)}
        title={label}
        type="button"
      >
        <EyeIcon crossed={visible} />
      </button>
    </div>
  );
}
