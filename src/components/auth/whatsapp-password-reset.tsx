"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { AuthPhoneField, callWhatsappAuth } from "@/components/auth/auth-phone-field";
import { OtpCodeStep, type CodeRequest } from "@/components/auth/otp-code-step";
import { PasswordResetRequestForm } from "@/components/auth/password-reset-request-form";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { texts } from "@/config/texts";
import { parsePhone } from "@/lib/phone";
import { checkPassword } from "@/modules/auth/password-policy";

const t = texts.auth;

/** Mot de passe oublié : par WhatsApp (code à 6 chiffres) ou par e-mail pour les anciens comptes. */
export function PasswordResetChooser() {
  const [method, setMethod] = useState<"whatsapp" | "email">("whatsapp");
  return (
    <>
      <div aria-label="Recevoir le code par" className="auth-method" role="group">
        <button aria-pressed={method === "whatsapp"} onClick={() => setMethod("whatsapp")} type="button">Par WhatsApp</button>
        <button aria-pressed={method === "email"} onClick={() => setMethod("email")} type="button">Par e-mail</button>
      </div>
      {method === "whatsapp" ? <WhatsappPasswordReset /> : <PasswordResetRequestForm />}
    </>
  );
}

function WhatsappPasswordReset() {
  const router = useRouter();
  const ids = { phone: useId(), password: useId() };
  const [country, setCountry] = useState("CM");
  const [national, setNational] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [request, setRequest] = useState<CodeRequest | null>(null);
  const [password, setPassword] = useState("");
  const phone = parsePhone(country, national);
  const passwordIssue = checkPassword(password);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    setError("");
    if (!phone.ok || pending) return;
    setPending(true);
    try {
      const result = await callWhatsappAuth<CodeRequest>("password/start", { phoneNumber: phone.e164 });
      if (!result.ok) setError(result.message);
      else setRequest(result.data);
    } catch {
      setError(texts.common.networkError);
    } finally {
      setPending(false);
    }
  }

  if (request) {
    return (
      <OtpCodeStep
        canSubmit={!passwordIssue}
        onChangeNumber={() => setRequest(null)}
        onResent={setRequest}
        onSubmit={async (code) => {
          const result = await callWhatsappAuth("password/reset", { phoneNumber: request.phoneNumber, code, newPassword: password });
          if (!result.ok) return result.message;
          router.push(`/connexion?motDePasseModifie=1&telephone=${encodeURIComponent(request.phoneNumber)}`);
          return null;
        }}
        pendingLabel="Enregistrement…"
        purpose="password"
        request={request}
        submitLabel="Enregistrer mon nouveau mot de passe"
      >
        <div className="auth-field">
          <label htmlFor={ids.password}>Nouveau mot de passe</label>
          <PasswordInput
            aria-describedby={`${ids.password}-help`}
            autoComplete="new-password"
            className={password && passwordIssue ? "is-invalid" : ""}
            id={ids.password}
            maxLength={128}
            onChange={(event) => setPassword(event.target.value)}
            value={password}
          />
          <p className={password && passwordIssue ? "auth-field-error" : "auth-field-help"} id={`${ids.password}-help`}>
            {password && passwordIssue
              ? passwordIssue === "tooShort"
                ? t.fields.passwordTooShort
                : passwordIssue === "tooLong"
                  ? t.fields.passwordTooLong
                  : t.fields.passwordTooCommon
              : t.signUp.passwordHelp}
          </p>
        </div>
      </OtpCodeStep>
    );
  }

  return (
    <form aria-busy={pending} className="auth-form" noValidate onSubmit={start}>
      <AuthPhoneField
        country={country}
        help="Le numéro WhatsApp de votre compte PrestAfrik."
        id={ids.phone}
        label="Numéro WhatsApp"
        national={national}
        onBlur={() => setTouched(true)}
        onCountryChange={setCountry}
        onNationalChange={setNational}
        showError={touched}
      />
      {error && <p className="auth-alert" role="alert">{error}</p>}
      <SubmitButton className="auth-submit" disabled={!phone.ok} loading={pending} pendingLabel="Envoi du code…">
        Recevoir un code sur WhatsApp
      </SubmitButton>
    </form>
  );
}
