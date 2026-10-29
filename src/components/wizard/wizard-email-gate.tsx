"use client";

import { EmailConfirmPanel } from "@/components/auth/email-confirm-panel";

/**
 * Avant de créer une boutique, l'adresse e-mail du compte doit être confirmée (comptes créés avant le code
 * par e-mail) : un code à 6 chiffres est envoyé, puis saisi ici. L'assistant s'ouvre ensuite.
 */
export function EmailVerificationGate({ email }: { email: string }) {
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
      <EmailConfirmPanel email={email} />
    </section>
  );
}
