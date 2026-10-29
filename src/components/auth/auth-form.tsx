"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { AuthPhoneField } from "@/components/auth/auth-phone-field";
import { EmailCodeStep, emailCodeResendDelayMs } from "@/components/auth/email-code-step";
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { texts } from "@/config/texts";
import { parsePhone } from "@/lib/phone";
import { authClient } from "@/modules/auth/client";
import { checkPassword, passwordStrength } from "@/modules/auth/password-policy";
import { CheckIcon } from "@/components/ui/icons";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  invitationToken?: string;
  /** Chemin interne vers lequel revenir après la connexion. */
  next?: string;
  /** Bouton « Continuer avec Google » (identifiants OAuth configurés sur le serveur). */
  googleEnabled?: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const t = texts.auth;
/** Accueil du tableau de bord après l'inscription : félicitations et première étape. */
export const welcomeHref = "/dashboard?bienvenue=1";
// Inscription en attente du code : gardée pendant l'onglet (actualisation) ; jamais le mot de passe.
const pendingKey = "prestafrik:inscription-code";

type Pending = { email: string; name: string; country: string; national: string; resendAt: number };

function readPending(): Pending | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(pendingKey) ?? "null") as Pending | null;
    return value?.email ? value : null;
  } catch {
    return null;
  }
}

function writePending(value: Pending | null) {
  try {
    if (value) sessionStorage.setItem(pendingKey, JSON.stringify(value));
    else sessionStorage.removeItem(pendingKey);
  } catch {
    // Stockage indisponible (navigation privée) : l'inscription fonctionne quand même.
  }
}

function safeInternalPath(path: string | undefined) {
  return path && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : null;
}

export function AuthForm({ mode, invitationToken, next, googleEnabled = false }: AuthFormProps) {
  const router = useRouter();
  const ids = { name: useId(), email: useId(), phone: useId(), password: useId(), help: useId() };
  const isSignUp = mode === "sign-up";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("CM");
  const [national, setNational] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  /** Code envoyé par e-mail : l'écran de saisie remplace le formulaire. */
  const [codeStep, setCodeStep] = useState<{ email: string; resendAt: number } | null>(null);

  const validInvitation = invitationToken && /^[A-Za-z0-9_-]{43}$/.test(invitationToken) ? invitationToken : null;
  const emailValid = emailPattern.test(email.trim());
  const nameValid = name.trim().length >= 2 && name.trim().length <= 80;
  const phone = parsePhone(country, national);
  const passwordIssue = checkPassword(password, isSignUp ? { email, name } : {});
  const strength = passwordStrength(password);
  const strengthLabel = t.fields.strength[strength];
  // Le bouton reste désactivé tant que les conditions ne sont pas remplies.
  const missing = isSignUp
    ? [
        !nameValid && "votre nom",
        !emailValid && "une adresse e-mail valide",
        !phone.ok && "votre numéro WhatsApp",
        passwordIssue && "un mot de passe de 8 caractères minimum",
        !acceptedTerms && "l’acceptation des conditions",
      ].filter(Boolean)
    : [!emailValid && "une adresse e-mail valide", !password && "votre mot de passe"].filter(Boolean);
  const canSubmit = missing.length === 0;
  const destination = validInvitation
    ? `/invitations/accepter?token=${encodeURIComponent(validInvitation)}`
    : (safeInternalPath(next) ?? (isSignUp ? welcomeHref : "/dashboard"));

  // Reprise après une actualisation : l'écran du code s'affiche de nouveau (inscription seulement).
  useEffect(() => {
    if (!isSignUp) return;
    const saved = readPending();
    if (!saved) return;
    setName(saved.name);
    setEmail(saved.email);
    setCountry(saved.country);
    setNational(saved.national);
    setCodeStep({ email: saved.email, resendAt: saved.resendAt });
  }, [isSignUp]);

  function showCodeStep(address: string) {
    const resendAt = Date.now() + emailCodeResendDelayMs;
    setCodeStep({ email: address, resendAt });
    if (isSignUp) writePending({ email: address, name: name.trim(), country, national, resendAt });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, email: true, phone: true, password: true, terms: true });
    setError("");
    if (!canSubmit || pending) return;

    setPending(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const result = isSignUp
        ? await authClient.signUp.email({ name: name.trim(), email: normalizedEmail, password, phoneNumber: phone.ok ? phone.e164 : "", callbackURL: destination })
        : await authClient.signIn.email({ email: normalizedEmail, password, rememberMe, callbackURL: destination });

      if (result.error) {
        const status = result.error.status;
        const code = "code" in result.error ? result.error.code : undefined;
        // Compte dont l'adresse n'est pas encore confirmée : un nouveau code vient de partir par e-mail.
        if (!isSignUp && code === "EMAIL_NOT_VERIFIED") {
          showCodeStep(normalizedEmail);
          return;
        }
        setError(
          status === 429
            ? t.signIn.tooManyAttempts
            : !isSignUp && (status === 401 || status === 403)
              ? t.signIn.invalidCredentials
              : isSignUp && (code === "EMAIL_TAKEN" || code === "USER_ALREADY_EXISTS" || status === 422)
                ? t.signUp.emailTaken
                : (result.error.message ?? texts.common.genericError),
        );
        return;
      }
      if (isSignUp) {
        showCodeStep(normalizedEmail);
        return;
      }
      router.push(destination);
      router.refresh();
    } catch {
      setError(texts.common.networkError);
    } finally {
      setPending(false);
      setResetSignal((value) => value + 1);
    }
  }

  if (codeStep) {
    return (
      <EmailCodeStep
        email={codeStep.email}
        intro={isSignUp ? undefined : "Votre adresse e-mail n’est pas encore confirmée."}
        onChangeEmail={() => {
          writePending(null);
          setCodeStep(null);
          setPassword("");
        }}
        onResent={(resendAt) => {
          setCodeStep({ ...codeStep, resendAt });
          if (isSignUp) writePending({ email: codeStep.email, name: name.trim(), country, national, resendAt });
        }}
        onVerified={() => {
          writePending(null);
          router.push(destination);
          router.refresh();
        }}
        resendAt={codeStep.resendAt}
        submitLabel={isSignUp ? "Valider et terminer mon inscription" : "Valider et me connecter"}
      />
    );
  }

  const showNameError = isSignUp && touched.name && !nameValid;
  const showEmailError = touched.email && email.length > 0 && !emailValid;
  const showPasswordError = isSignUp && touched.password && password.length > 0 && passwordIssue;

  return (
    <form aria-busy={pending} className="auth-form" noValidate onSubmit={submit}>
      {googleEnabled && !validInvitation && (
        <>
          <GoogleButton callbackURL={safeInternalPath(next) ?? "/dashboard"} newUserCallbackURL={welcomeHref} />
          <p aria-hidden="true" className="auth-divider"><span>{t.signIn.or}</span></p>
        </>
      )}

      {isSignUp && (
        <div className="auth-field">
          <label htmlFor={ids.name}>{t.signUp.name}</label>
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
      )}

      <div className="auth-field">
        <label htmlFor={ids.email}>{t.fields.email}</label>
        <div className={`auth-input ${emailValid ? "is-valid" : ""} ${showEmailError ? "is-invalid" : ""}`}>
          <input
            aria-describedby={`${ids.email}-help`}
            aria-invalid={showEmailError || undefined}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            id={ids.email}
            inputMode="email"
            maxLength={254}
            name="email"
            onBlur={() => setTouched((value) => ({ ...value, email: true }))}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t.fields.emailPlaceholder}
            required
            spellCheck={false}
            type="email"
            value={email}
          />
          {emailValid && <span aria-hidden="true" className="auth-input-check"><CheckIcon /></span>}
        </div>
        <p
          aria-live="polite"
          className={showEmailError ? "auth-field-error" : emailValid ? "auth-field-success" : "auth-field-help"}
          id={`${ids.email}-help`}
        >
          {showEmailError ? t.fields.emailInvalid : emailValid ? (isSignUp ? t.signUp.emailHelp : t.fields.emailValid) : ""}
        </p>
      </div>

      {isSignUp && (
        <AuthPhoneField
          country={country}
          help={t.signUp.phoneHelp}
          id={ids.phone}
          label={t.signUp.phone}
          national={national}
          onBlur={() => setTouched((value) => ({ ...value, phone: true }))}
          onCountryChange={setCountry}
          onNationalChange={setNational}
          showError={Boolean(touched.phone)}
        />
      )}

      <div className="auth-field">
        <label htmlFor={ids.password}>{t.fields.password}</label>
        <PasswordInput
          aria-describedby={ids.help}
          aria-invalid={Boolean(showPasswordError) || undefined}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className={showPasswordError ? "is-invalid" : ""}
          id={ids.password}
          maxLength={128}
          name="password"
          onBlur={() => setTouched((value) => ({ ...value, password: true }))}
          onChange={(event) => setPassword(event.target.value)}
          required
          resetSignal={resetSignal}
          value={password}
        />
        {isSignUp && password.length > 0 && (
          <>
            <div aria-hidden="true" className="password-meter" data-score={strength}>
              {[1, 2, 3, 4].map((step) => <span className={step <= strength ? "filled" : ""} key={step} />)}
            </div>
            <p className={`password-meter-label score-${strength}`} aria-live="polite">{strengthLabel}</p>
          </>
        )}
        <p className={showPasswordError ? "auth-field-error" : "auth-field-help"} id={ids.help}>
          {showPasswordError
            ? passwordIssue === "tooShort"
              ? t.fields.passwordTooShort
              : passwordIssue === "tooLong"
                ? t.fields.passwordTooLong
                : t.fields.passwordTooCommon
            : isSignUp
              ? t.signUp.passwordHelp
              : t.fields.passwordTip}
        </p>
      </div>

      {isSignUp ? (
        <label className={`auth-checkbox ${touched.terms && !acceptedTerms ? "is-invalid" : ""}`}>
          <input checked={acceptedTerms} name="terms" onChange={(event) => setAcceptedTerms(event.target.checked)} required type="checkbox" />
          <span>
            {t.signUp.terms}{" "}
            <Link href="/legal/conditions-generales" target="_blank">{t.signUp.termsLink}</Link>
          </span>
        </label>
      ) : (
        <div className="auth-row">
          <label className="auth-checkbox">
            <input checked={rememberMe} name="rememberMe" onChange={(event) => setRememberMe(event.target.checked)} type="checkbox" />
            <span>{t.signIn.rememberMe}</span>
          </label>
          <Link href="/mot-de-passe-oublie">{t.signIn.forgotPassword}</Link>
        </div>
      )}
      {isSignUp && touched.terms && !acceptedTerms && <p className="auth-field-error">{t.signUp.termsRequired}</p>}

      {error && <p className="auth-alert" role="alert">{error}</p>}

      <SubmitButton aria-describedby={canSubmit ? undefined : `${ids.help}-missing`} className="auth-submit" disabled={!canSubmit} loading={pending} pendingLabel={isSignUp ? t.signUp.pending : t.signIn.pending}>
        {isSignUp ? t.signUp.submit : t.signIn.submit}
      </SubmitButton>
      {!canSubmit && (
        <p aria-live="polite" className="auth-submit-hint" id={`${ids.help}-missing`}>
          Pour continuer : {missing.join(", ")}.
        </p>
      )}
      {!isSignUp && <p className="auth-secure-note">{t.signIn.secureNote}</p>}

      <p className="auth-switch">
        {isSignUp ? t.signUp.footerQuestion : t.signIn.footerQuestion}{" "}
        <Link href={`${isSignUp ? "/connexion" : "/inscription"}${validInvitation ? `?invitation=${encodeURIComponent(validInvitation)}` : ""}`}>
          {isSignUp ? t.signUp.footerLink : t.signIn.footerLink}
        </Link>
      </p>
    </form>
  );
}
