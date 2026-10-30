"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { AuthPhoneField } from "@/components/auth/auth-phone-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { texts } from "@/config/texts";
import { parsePhone } from "@/lib/phone";
import { authClient } from "@/modules/auth/client";

/** Numéro WhatsApp du compte (après une inscription avec Google) : validé et enregistré, puis tableau de bord. */
export function WhatsappNumberForm({ next }: { next: string }) {
  const router = useRouter();
  const id = useId();
  const [country, setCountry] = useState("CM");
  const [national, setNational] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const phone = parsePhone(country, national);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    setError("");
    if (!phone.ok || pending) return;
    setPending(true);
    try {
      const result = await authClient.updateUser({ phoneNumber: phone.e164 });
      if (result.error) {
        const code = "code" in result.error ? result.error.code : undefined;
        setError(code === "PHONE_TAKEN" ? texts.auth.signUp.phoneTaken : (result.error.message ?? texts.common.genericError));
        setPending(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError(texts.common.networkError);
      setPending(false);
    }
  }

  return (
    <form aria-busy={pending} className="auth-form" noValidate onSubmit={submit}>
      <AuthPhoneField
        country={country}
        help={texts.auth.signUp.phoneHelp}
        id={id}
        label={texts.auth.signUp.phone}
        national={national}
        onBlur={() => setTouched(true)}
        onCountryChange={setCountry}
        onNationalChange={setNational}
        showError={touched}
      />
      {error && <p className="auth-alert" role="alert">{error}</p>}
      <SubmitButton className="auth-submit" disabled={!phone.ok} loading={pending} pendingLabel="Enregistrement…">
        Enregistrer et continuer
      </SubmitButton>
      <p className="auth-secure-note">Votre numéro reste privé : il n’apparaît sur votre boutique que si vous le choisissez.</p>
    </form>
  );
}
