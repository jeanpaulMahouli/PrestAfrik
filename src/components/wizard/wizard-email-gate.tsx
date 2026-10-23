"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authClient } from "@/modules/auth/client";

/**
 * Avant de créer une boutique, l'adresse e-mail du compte doit être confirmée : on demande au vendeur
 * de consulter sa boîte de réception. Le lien de l'e-mail ramène directement à l'assistant.
 */
export function EmailVerificationGate({ email }: { email: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "pending" | "sent" | "error">("idle");
  const [checking, startChecking] = useTransition();

  async function resend() {
    setState("pending");
    const result = await authClient.sendVerificationEmail({ email, callbackURL: "/boutiques/nouvelle" }).catch(() => ({ error: true }));
    setState(result.error ? "error" : "sent");
  }

  return (
    <section aria-labelledby="email-gate-title" className="wizard-card email-gate">
      <span aria-hidden="true" className="email-gate-icon">
        <svg fill="none" height="28" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="28">
          <rect height="16" rx="2" width="20" x="2" y="4" />
          <path d="m22 7-10 6L2 7" />
        </svg>
      </span>
      <h1 id="email-gate-title">Confirmez votre adresse e-mail</h1>
      <p className="wizard-subtitle">
        Avant de créer votre boutique, nous devons vérifier que cette adresse est bien la vôtre. C’est elle qui recevra vos nouvelles commandes et vous permettra de récupérer
        votre compte.
      </p>
      <div className="email-confirm">
        <ol>
          <li>
            Ouvrez votre messagerie <b>{email}</b> (sur votre téléphone ou votre ordinateur).
          </li>
          <li>Cherchez l’e-mail « Confirmez votre adresse e-mail pour activer votre compte PrestAfrik ». Pensez à regarder dans les courriers indésirables (spam).</li>
          <li>Touchez « Confirmer mon adresse e-mail » : vous reviendrez directement ici pour créer votre boutique.</li>
        </ol>
      </div>
      <div className="wizard-actions">
        <button className="btn btn-secondary" disabled={state === "pending" || state === "sent"} onClick={resend} type="button">
          {state === "pending" ? "Envoi…" : state === "sent" ? "E-mail renvoyé" : "Je n’ai rien reçu : renvoyer l’e-mail"}
        </button>
        <button className="btn btn-primary" disabled={checking} onClick={() => startChecking(() => router.refresh())} type="button">
          {checking ? "Vérification…" : "J’ai confirmé mon adresse"}
        </button>
      </div>
      {state === "sent" && (
        <p className="v-banner v-banner-success" role="status">
          Un nouvel e-mail vient de partir vers {email}. Il peut mettre une ou deux minutes à arriver.
        </p>
      )}
      {state === "error" && (
        <p className="v-banner v-banner-danger" role="alert">
          L’envoi a échoué. Réessayez dans quelques instants.
        </p>
      )}
    </section>
  );
}
