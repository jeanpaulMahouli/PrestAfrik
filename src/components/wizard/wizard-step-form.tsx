"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, type ReactNode } from "react";
import type { WizardState } from "@/modules/stores/wizard-actions";
import { BackIcon } from "@/components/ui/icons";
import { useFormPersistence } from "@/components/ui/use-form-persistence";

type Action = (previous: WizardState, formData: FormData) => Promise<WizardState>;

/** Étapes 1 à 4 : nécessaires pour créer la boutique. 5 à 8 : valeurs par défaut, modifiables ensuite. */
export const optionalWizardSteps = new Set([5, 6, 7, 8]);

function wizardRequirement(step: number): "required" | "optional" | undefined {
  if (step >= 1 && step <= 4) return "required";
  return optionalWizardSteps.has(step) ? "optional" : undefined;
}

type WizardStepFormProps = {
  action: Action;
  /** Boutique en cours de création (null avant la première étape). */
  draftId: string | null;
  /** Numéro de l'étape : sert à garder la saisie non enregistrée (actualisation, retour en arrière). */
  step: number;
  title: string;
  subtitle: string;
  backHref?: string;
  submitLabel?: string;
  /** Bouton secondaire (ex. « Passer cette étape »). */
  secondary?: ReactNode;
  /** « Obligatoire » ou « Facultatif » au-dessus du titre (rien pour le récapitulatif). */
  requirement?: "required" | "optional";
  children: (fieldError: (field: string) => string | undefined, pending: boolean) => ReactNode;
};

/** Carte d'étape de l'assistant : envoi sans perte de saisie, erreurs sous les champs, Retour / Continuer. */
export function WizardStepForm({ action, draftId, step, title, subtitle, backHref, submitLabel = "Continuer", secondary, requirement = wizardRequirement(step), children }: WizardStepFormProps) {
  const [state, dispatch, pending] = useActionState<WizardState, FormData>(action, null);
  const fieldError = (field: string) => (state && !state.ok && state.field === field ? state.message : undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useFormPersistence(formRef, `assistant:${draftId ?? "nouvelle"}:etape-${step}`);

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
      ref={formRef}
    >
      {draftId && <input name="draftId" type="hidden" value={draftId} />}
      {requirement && (
        <p className={`wizard-requirement wizard-requirement-${requirement}`}>
          {requirement === "required" ? "Étape obligatoire" : "Étape facultative : vous pourrez la faire plus tard"}
        </p>
      )}
      <h1>{title}</h1>
      <p className="wizard-subtitle">{subtitle}</p>
      {state && !state.ok && (
        <p className="v-banner v-banner-danger" role="alert">
          <strong>À corriger : </strong>
          {state.message}
        </p>
      )}
      {children(fieldError, pending)}
      <div className="wizard-actions">
        <Link className="btn btn-secondary" href={backHref ?? "/dashboard"}>
          <BackIcon /> Retour
        </Link>
        <span className="wizard-actions-end">
          {secondary}
          <button className="btn btn-primary wizard-continue" disabled={pending} type="submit">
            {pending ? "Enregistrement…" : submitLabel}
          </button>
        </span>
      </div>
    </form>
  );
}
