"use client";

import Link from "next/link";
import { SocialShare } from "@/components/shared/social-share";
import { CopyButton } from "@/components/ui/copy-button";
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
                Votre boutique sera créée tout de suite. Pour la mettre en ligne, il faudra ajouter au moins un produit : l’écran suivant vous indiquera
                comment, en quelques secondes.
              </p>
            ))}
        </>
      )}
    </WizardStepForm>
  );
}

/** Lien de la boutique à copier ; « Voir ma boutique » sur la même ligne une fois la boutique en ligne. */
function StoreLink({ storeUrl, showView = false }: { storeUrl: string; showView?: boolean }) {
  const display = storeUrl.replace(/^https?:\/\//, "");
  return (
    <label className="v-field">
      Le lien de votre boutique
      <span className="share-link-row">
        <input readOnly value={display} />
        <CopyButton label="Copier" value={storeUrl} />
        {showView && (
          <a className="btn btn-primary" href={storeUrl} rel="noopener noreferrer" target="_blank">
            Voir ma boutique
          </a>
        )}
      </span>
    </label>
  );
}

/** Écran « Boutique publiée » : lien (copier, voir), partage sur les réseaux, prochaines étapes. */
export function PublishedScreen({ storeName, storeUrl }: { storeName: string; storeUrl: string }) {
  return (
    <section aria-labelledby="published-title" className="wizard-card wizard-published">
      <span aria-hidden="true" className="wizard-published-icon"><CheckIcon size={24} /></span>
      <h1 id="published-title">Félicitations, votre boutique prend vie !</h1>
      <p className="wizard-subtitle">
        Elle est maintenant visible par vos clients. Partagez-la sans attendre : le premier client est peut-être déjà en train de la chercher.
      </p>
      <StoreLink showView storeUrl={storeUrl} />
      <SocialShare text={`Découvrez ma boutique ${storeName}`} title={storeName} url={storeUrl} />
      <div className="wizard-next wizard-next-pair">
        <Link className="btn btn-secondary" href="/dashboard/produits/nouveau">Ajouter d’autres produits</Link>
        <Link className="btn btn-primary" href="/dashboard">Aller à mon tableau de bord</Link>
      </div>
    </section>
  );
}

/** Écran « Boutique créée » : elle existe mais n'est pas encore en ligne (produit à ajouter…). */
export function CreatedScreen({ storeName, storeUrl, missing }: { storeName: string; storeUrl: string; missing: { label: string; href: string }[] }) {
  return (
    <section aria-labelledby="created-title" className="wizard-card wizard-published">
      <span aria-hidden="true" className="wizard-published-icon"><CheckIcon size={24} /></span>
      <h1 id="created-title">Votre boutique « {storeName} » est créée !</h1>
      <p className="wizard-subtitle">
        Elle n’est pas encore visible par vos clients. Il reste {missing.length > 1 ? "quelques étapes" : "une étape"} avant de la mettre en ligne, à faire quand vous voulez :
      </p>
      {missing.length > 0 && (
        <ul className="publish-missing-list">
          {missing.map((item) => (
            <li key={item.label}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      )}
      <StoreLink storeUrl={storeUrl} />
      <div className="wizard-next wizard-next-pair">
        <Link className="btn btn-secondary" href="/dashboard/produits/nouveau">Ajouter des produits</Link>
        <Link className="btn btn-primary" href="/dashboard">Aller à mon tableau de bord</Link>
      </div>
    </section>
  );
}
