"use client";

import Link from "next/link";
import { WizardStepForm } from "@/components/wizard/wizard-step-form";
import { finishWizard } from "@/modules/stores/wizard-actions";
import { CheckIcon } from "@/components/ui/icons";

type RecapItem = { label: string; value: string; step: number; done: boolean };

/** Dernière étape : récapitulatif et création. L'adresse e-mail est déjà confirmée (écran préalable de l'assistant). */
export function PublishStep({ draftId, recap, missing, hasProduct }: { draftId: string; recap: RecapItem[]; missing: { label: string; step: number }[]; hasProduct: boolean }) {
  const stepHref = (step: number) => `/boutiques/nouvelle?brouillon=${draftId}&etape=${step}`;
  return (
    <WizardStepForm
      action={finishWizard}
      backHref={stepHref(8)}
      draftId={draftId}
      step={9}
      subtitle="Vérifiez ce récapitulatif : votre boutique sera créée en touchant le bouton ci-dessous. Vous pourrez toujours modifier chaque information ensuite."
      submitLabel={hasProduct ? "Créer et publier ma boutique" : "Créer ma boutique"}
      title="Tout est prêt ?"
    >
      {() => (
        <>
          <ul className="wizard-recap">
            {recap.map((item) => (
              <li className={item.done ? "is-done" : ""} key={item.label}>
                <span aria-hidden="true" className="wizard-recap-dot">{item.done ? <CheckIcon size={11} /> : "!"}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.value}</small>
                </span>
                <Link href={stepHref(item.step)}>Modifier</Link>
              </li>
            ))}
          </ul>
          {missing.length > 0 && (
            <div className="v-banner v-banner-danger" role="alert">
              <strong>Il manque encore quelques informations pour créer votre boutique :</strong>
              <ul className="publish-missing-list">
                {missing.map((item) => (
                  <li key={item.label}>
                    <Link href={stepHref(item.step)}>Compléter {item.label} (étape {item.step})</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {missing.length === 0 &&
            (hasProduct ? (
              <p className="v-banner v-banner-info">
                Votre boutique sera créée et mise en ligne tout de suite. Vos commandes arriveront dans « Commandes » : écrivez au client sur WhatsApp, puis touchez « Valider ».
              </p>
            ) : (
              <p className="v-banner v-banner-info">
                Votre boutique sera créée tout de suite. Pour la mettre en ligne, il faudra ajouter au moins un produit : votre tableau de bord vous indiquera
                comment, en quelques secondes.
              </p>
            ))}
        </>
      )}
    </WizardStepForm>
  );
}
