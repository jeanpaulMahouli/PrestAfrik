"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmailCodeStep, emailCodeResendDelayMs } from "@/components/auth/email-code-step";
import { texts } from "@/config/texts";
import { authClient } from "@/modules/auth/client";

/**
 * Compte connecté dont l'adresse n'est pas encore confirmée (comptes créés avant le code par e-mail) :
 * envoi d'un code à 6 chiffres, puis saisie. Une fois confirmé, la page se recharge (ou va vers doneHref).
 */
export function EmailConfirmPanel({ email, doneHref }: { email: string; doneHref?: string }) {
  const router = useRouter();
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "pending" | "error">("idle");

  async function send() {
    setState("pending");
    const result = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" }).catch(() => ({ error: true }));
    if (result.error) {
      setState("error");
      return;
    }
    setState("idle");
    setResendAt(Date.now() + emailCodeResendDelayMs);
  }

  if (resendAt !== null) {
    return (
      <EmailCodeStep
        email={email}
        intro="Confirmez votre adresse e-mail."
        onResent={setResendAt}
        onVerified={() => {
          if (doneHref) router.push(doneHref);
          router.refresh();
        }}
        resendAt={resendAt}
        submitLabel="Confirmer mon adresse"
      />
    );
  }

  return (
    <div className="email-confirm">
      <p>
        Nous allons envoyer un code à 6 chiffres à <b>{email}</b>. Saisissez-le ensuite ici : votre adresse sera confirmée.
      </p>
      <button className="btn btn-primary" disabled={state === "pending"} onClick={send} type="button">
        {state === "pending" ? "Envoi du code…" : "Recevoir le code par e-mail"}
      </button>
      {state === "error" && (
        <p className="v-field-error" role="alert">
          {texts.common.genericError}
        </p>
      )}
    </div>
  );
}
