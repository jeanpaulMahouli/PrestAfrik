"use client";

import Link from "next/link";
import { startTransition, useActionState, type ReactNode } from "react";
import type { WizardState } from "@/modules/stores/wizard-actions";

type Action = (previous: WizardState, formData: FormData) => Promise<WizardState>;

type WizardStepFormProps = {
  action: Action;
  storeId: string | null;
  title: string;
  subtitle: string;
  backHref?: string;
  submitLabel?: string;
  /** Bouton secondaire (ex. « Passer cette étape »). */
  secondary?: ReactNode;
  children: (fieldError: (field: string) => string | undefined, pending: boolean) => ReactNode;
};

/** Carte d'étape de l'assistant : envoi sans perte de saisie, erreurs sous les champs, Retour / Continuer. */
export function WizardStepForm({ action, storeId, title, subtitle, backHref, submitLabel = "Continuer", secondary, children }: WizardStepFormProps) {
  const [state, dispatch, pending] = useActionState<WizardState, FormData>(action, null);
  const fieldError = (field: string) => (state && !state.ok && state.field === field ? state.message : undefined);

  return (
    <form
      className="wizard-card"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.name) data.set(submitter.name, submitter.value);
        startTransition(() => dispatch(data));
      }}
    >
      {storeId && <input name="storeId" type="hidden" value={storeId} />}
      <h1>{title}</h1>
      <p className="wizard-subtitle">{subtitle}</p>
      {state && !state.ok && !state.field && <p className="v-banner v-banner-danger" role="alert">{state.message}</p>}
      {children(fieldError, pending)}
      <div className="wizard-actions">
        {backHref ? (
          <Link className="btn btn-secondary" href={backHref}>← Retour</Link>
        ) : (
          <Link className="btn btn-secondary" href="/dashboard">← Retour</Link>
        )}
        <span className="wizard-actions-end">
          {secondary}
          <button className="btn btn-primary wizard-continue" disabled={pending} type="submit">
            {pending ? "Enregistrement…" : `${submitLabel} →`}
          </button>
        </span>
      </div>
    </form>
  );
}
