"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { AuthPhoneField, callWhatsappAuth } from "@/components/auth/auth-phone-field";
import { OtpCodeStep, type CodeRequest } from "@/components/auth/otp-code-step";
import { CheckIcon } from "@/components/ui/icons";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { texts } from "@/config/texts";
import { parsePhone } from "@/lib/phone";
import { checkPassword, passwordStrength } from "@/modules/auth/password-policy";

const t = texts.auth;
// Nom et numéro gardés pendant l'inscription (actualisation, retour) ; jamais le mot de passe.
const storageKey = "prestafrik:inscription-whatsapp";

type Saved = { name: string; country: string; national: string; request: CodeRequest | null };

function readSaved(): Saved | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as Saved | null;
    if (value?.request && new Date(value.request.expiresAt).getTime() <= Date.now() - 30 * 60_000) value.request = null;
    return value;
  } catch {
    return null;
  }
}

function writeSaved(value: Saved | null) {
  try {
    if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
    else sessionStorage.removeItem(storageKey);
  } catch {
    // Stockage indisponible (navigation privée) : l'inscription fonctionne quand même.
  }
}

/**
 * Inscription en deux temps (nom, numéro WhatsApp, mot de passe → code reçu sur WhatsApp).
 * Le compte n'est créé qu'une fois le code vérifié ; il est alors connecté et part créer sa boutique.
 */
export function WhatsappSignUpForm({ next = "/boutiques/nouvelle" }: { next?: string }) {
  const router = useRouter();
  const ids = { name: useId(), phone: useId(), password: useId() };
  const [name, setName] = useState("");
  const [country, setCountry] = useState("CM");
  const [national, setNational] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [pending, setPending] = useState(false);
  const [request, setRequest] = useState<CodeRequest | null>(null);
  const [restored, setRestored] = useState(false);

  // Reprise après une actualisation : champs et, si un code a été envoyé, l'écran de saisie du code.
  useEffect(() => {
    const saved = readSaved();
    if (saved) {
      setName(saved.name);
      setCountry(saved.country || "CM");
      setNational(saved.national);
      setRequest(saved.request);
    }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (restored) writeSaved({ name, country, national, request });
  }, [restored, name, country, national, request]);

  const phone = parsePhone(country, national);
  const nameValid = name.trim().length >= 2 && name.trim().length <= 80;
  const passwordIssue = checkPassword(password, { name });
  const strength = passwordStrength(password);
  const missing = [!nameValid && "votre nom complet", !phone.ok && "un numéro WhatsApp valide", passwordIssue && "un mot de passe de 8 caractères minimum"].filter(Boolean);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, phone: true, password: true });
    setError("");
    setErrorCode("");
    if (!nameValid || !phone.ok || passwordIssue || pending) return;
    setPending(true);
    try {
      const result = await callWhatsappAuth<CodeRequest & { sent: boolean }>("sign-up/start", { name: name.trim(), phoneNumber: phone.e164, password });
      if (!result.ok) {
        setError(result.message);
        setErrorCode(result.code);
        return;
      }
      setRequest(result.data);
    } catch {
      setError(texts.common.networkError);
    } finally {
      setPending(false);
    }
  }

  async function verify(code: string) {
    if (!request) return null;
    const result = await callWhatsappAuth("sign-up/verify", { phoneNumber: request.phoneNumber, code, rememberMe: true });
    if (!result.ok) {
      if (result.code === "ALREADY_VERIFIED" || result.code === "PHONE_TAKEN") {
        writeSaved(null);
        router.push(`/connexion?telephone=${encodeURIComponent(request.phoneNumber)}`);
      }
      return result.message;
    }
    writeSaved(null);
    router.push(next);
    router.refresh();
    return null;
  }

  if (request) {
    return (
      <>
        <OtpCodeStep
          onChangeNumber={() => {
            setRequest(null);
            setPassword("");
          }}
          onResent={setRequest}
          onSubmit={verify}
          pendingLabel="Vérification…"
          purpose="sign-up"
          request={request}
          submitLabel="Vérifier et créer mon compte"
        />
        <p className="auth-switch">
          {t.signUp.footerQuestion} <Link href="/connexion">{t.signUp.footerLink}</Link>
        </p>
      </>
    );
  }

  const showNameError = touched.name && !nameValid;
  const showPasswordError = touched.password && password.length > 0 && passwordIssue;

  return (
    <form aria-busy={pending} className="auth-form" noValidate onSubmit={submit}>
      <div className="auth-field">
        <label htmlFor={ids.name}>Nom complet</label>
        <div className={`auth-input ${nameValid ? "is-valid" : ""} ${showNameError ? "is-invalid" : ""}`}>
          <input
            aria-describedby={showNameError ? `${ids.name}-error` : undefined}
            aria-invalid={showNameError || undefined}
            autoComplete="name"
            id={ids.name}
            maxLength={80}
            name="name"
            onBlur={() => setTouched((value) => ({ ...value, name: true }))}
            onChange={(event) => setName(event.target.value)}
            placeholder={t.signUp.namePlaceholder}
            required
            value={name}
          />
          {nameValid && <span aria-hidden="true" className="auth-input-check"><CheckIcon /></span>}
        </div>
        {showNameError && <p className="auth-field-error" id={`${ids.name}-error`}>{t.signUp.nameInvalid}</p>}
      </div>

      <AuthPhoneField
        country={country}
        help="Nous y enverrons un code de vérification par WhatsApp."
        id={ids.phone}
        label="Numéro WhatsApp"
        national={national}
        onBlur={() => setTouched((value) => ({ ...value, phone: true }))}
        onCountryChange={setCountry}
        onNationalChange={setNational}
        showError={Boolean(touched.phone)}
      />

      <div className="auth-field">
        <label htmlFor={ids.password}>{t.fields.password}</label>
        <PasswordInput
          aria-describedby={`${ids.password}-help`}
          aria-invalid={Boolean(showPasswordError) || undefined}
          autoComplete="new-password"
          className={showPasswordError ? "is-invalid" : ""}
          id={ids.password}
          maxLength={128}
          name="password"
          onBlur={() => setTouched((value) => ({ ...value, password: true }))}
          onChange={(event) => setPassword(event.target.value)}
          required
          value={password}
        />
        {password.length > 0 && (
          <>
            <div aria-hidden="true" className="password-meter" data-score={strength}>
              {[1, 2, 3, 4].map((step) => <span className={step <= strength ? "filled" : ""} key={step} />)}
            </div>
            <p aria-live="polite" className={`password-meter-label score-${strength}`}>{t.fields.strength[strength]}</p>
          </>
        )}
        <p className={showPasswordError ? "auth-field-error" : "auth-field-help"} id={`${ids.password}-help`}>
          {showPasswordError
            ? passwordIssue === "tooShort"
              ? t.fields.passwordTooShort
              : passwordIssue === "tooLong"
                ? t.fields.passwordTooLong
                : t.fields.passwordTooCommon
            : t.signUp.passwordHelp}
        </p>
      </div>

      {error && (
        <p className="auth-alert" role="alert">
          {error}
          {errorCode === "PHONE_TAKEN" && (
            <>
              {" "}
              <Link href={`/connexion?telephone=${encodeURIComponent(phone.ok ? phone.e164 : "")}`}>Me connecter</Link>
            </>
          )}
        </p>
      )}

      <SubmitButton className="auth-submit" disabled={missing.length > 0} loading={pending} pendingLabel="Envoi du code…">
        {t.signUp.submit}
      </SubmitButton>
      {missing.length > 0 ? (
        <p aria-live="polite" className="auth-submit-hint">Pour continuer : {missing.join(", ")}.</p>
      ) : (
        <p className="auth-submit-hint">Vous recevrez un code sur WhatsApp pour confirmer votre numéro.</p>
      )}
      <p className="auth-terms-note">
        En créant votre compte, vous acceptez les <Link href="/legal/conditions-generales" target="_blank">conditions d’utilisation</Link> et la{" "}
        <Link href="/legal/politique-de-confidentialite" target="_blank">politique de confidentialité</Link> de PrestAfrik.
      </p>

      <p className="auth-switch">
        {t.signUp.footerQuestion} <Link href="/connexion">{t.signUp.footerLink}</Link>
      </p>
    </form>
  );
}
