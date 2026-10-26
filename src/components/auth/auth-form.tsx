"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { texts } from "@/config/texts";
import { authClient } from "@/modules/auth/client";
import { checkPassword, passwordStrength } from "@/modules/auth/password-policy";
import { CheckIcon } from "@/components/ui/icons";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  invitationToken?: string;
  /** Chemin interne vers lequel revenir après la connexion. */
  next?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const t = texts.auth;

function safeInternalPath(path: string | undefined) {
  return path && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : null;
}

export function AuthForm({ mode, invitationToken, next }: AuthFormProps) {
  const router = useRouter();
  const ids = { name: useId(), email: useId(), password: useId(), help: useId() };
  const isSignUp = mode === "sign-up";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const validInvitation = invitationToken && /^[A-Za-z0-9_-]{43}$/.test(invitationToken) ? invitationToken : null;
  const emailValid = emailPattern.test(email.trim());
  const nameValid = name.trim().length >= 2 && name.trim().length <= 80;
  const passwordIssue = checkPassword(password, isSignUp ? { email, name } : {});
  const strength = passwordStrength(password);
  const strengthLabel = t.fields.strength[strength];
  // Le bouton reste désactivé tant que les conditions ne sont pas remplies.
  const missing = isSignUp
    ? [!nameValid && "votre nom", !emailValid && "une adresse e-mail valide", passwordIssue && "un mot de passe de 8 caractères minimum", !acceptedTerms && "l’acceptation des conditions"].filter(Boolean)
    : [!emailValid && "une adresse e-mail valide", !password && "votre mot de passe"].filter(Boolean);
  const canSubmit = missing.length === 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, email: true, password: true, terms: true });
    setError("");
    if (!emailValid || (isSignUp && (!nameValid || passwordIssue || !acceptedTerms))) return;

    setPending(true);
    const callbackURL = validInvitation
      ? `/invitations/accepter?token=${encodeURIComponent(validInvitation)}`
      : safeInternalPath(next) ?? (isSignUp ? "/boutiques/nouvelle" : "/dashboard");
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const result = isSignUp
        ? await authClient.signUp.email({ name: name.trim(), email: normalizedEmail, password, callbackURL })
        : await authClient.signIn.email({ email: normalizedEmail, password, rememberMe, callbackURL });

      if (result.error) {
        const status = result.error.status;
        const code = "code" in result.error ? result.error.code : undefined;
        setError(
          status === 429
            ? t.signIn.tooManyAttempts
            : !isSignUp && (status === 401 || status === 403)
              ? t.signIn.invalidCredentials
              : isSignUp && (code === "USER_ALREADY_EXISTS" || status === 422)
                ? t.signUp.emailTaken
                : result.error.message ?? texts.common.genericError,
        );
        return;
      }
      router.push(callbackURL);
      router.refresh();
    } catch {
      setError(texts.common.networkError);
    } finally {
      setPending(false);
      setResetSignal((value) => value + 1);
    }
  }

  const showNameError = isSignUp && touched.name && !nameValid;
  const showEmailError = touched.email && email.length > 0 && !emailValid;
  const showPasswordError = isSignUp && touched.password && password.length > 0 && passwordIssue;

  return (
    <form aria-busy={pending} className="auth-form" noValidate onSubmit={submit}>
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
