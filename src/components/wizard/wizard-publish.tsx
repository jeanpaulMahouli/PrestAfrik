"use client";

import Link from "next/link";
import { useState } from "react";
import { SocialShare } from "@/components/shared/social-share";
import { CopyButton } from "@/components/ui/copy-button";
import { WizardStepForm } from "@/components/wizard/wizard-step-form";
import { authClient } from "@/modules/auth/client";
import { finishWizard } from "@/modules/stores/wizard-actions";
import { CheckIcon } from "@/components/ui/icons";

type RecapItem = { label: string; value: string; step: number; done: boolean };

/**
 * Confirmation de l'adresse e-mail : ce qu'il faut faire, et la possibilité de le faire plus tard.
 * Tant que l'adresse n'est pas confirmée, la boutique est créée mais pas encore visible des clients.
 */
export function EmailConfirmationNotice({ email, afterCreation = false }: { email: string; afterCreation?: boolean }) {
  const [state, setState] = useState<"idle" | "pending" | "sent" | "error">("idle");
  async function resend() {
    setState("pending");
    const result = await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" }).catch(() => ({ error: true }));
    setState(result.error ? "error" : "sent");
  }

  return (
    <div className="email-confirm" role="status">
      <strong>Confirmez votre adresse e-mail pour mettre votre boutique en ligne</strong>
      <ol>
        <li>
          Ouvrez votre messagerie <b>{email}</b> (sur votre téléphone ou votre ordinateur).
        </li>
        <li>
          Cherchez l’e-mail « Confirmez votre adresse e-mail pour activer votre compte PrestAfrik ». Pensez à regarder dans les courriers indésirables
          (spam).
        </li>
        <li>Touchez le bouton « Confirmer mon adresse e-mail » dans cet e-mail. Le lien est valable 48 heures : sinon, renvoyez-le ci-dessous.</li>
      </ol>
      <p>
        {afterCreation
          ? "Votre boutique est bien créée : vous pouvez déjà ajouter vos produits. Elle sera visible par vos clients dès que votre adresse sera confirmée et que vous l’aurez publiée depuis votre tableau de bord."
          : "Pas le temps maintenant ? Vous pouvez confirmer plus tard : votre boutique sera quand même créée, et vous la publierez depuis votre tableau de bord une fois l’adresse confirmée."}
      </p>
      <button className="btn btn-secondary btn-sm" disabled={state === "pending" || state === "sent"} onClick={resend} type="button">
        {state === "pending" ? "Envoi…" : state === "sent" ? "E-mail renvoyé : regardez votre boîte de réception" : "Je n’ai rien reçu : renvoyer l’e-mail"}
      </button>
      {state === "error" && <p className="v-field-error">L’envoi a échoué. Réessayez dans quelques instants.</p>}
    </div>
  );
}

/** Dernière étape : récapitulatif et création. L'adresse e-mail est déjà confirmée (écran préalable de l'assistant). */
export function PublishStep({ draftId, recap, missing }: { draftId: string; recap: RecapItem[]; missing: { label: string; step: number }[] }) {
  const stepHref = (step: number) => `/boutiques/nouvelle?brouillon=${draftId}&etape=${step}`;
  return (
    <WizardStepForm
      action={finishWizard}
      backHref={stepHref(8)}
      draftId={draftId}
      step={9}
      subtitle="Vérifiez ce récapitulatif : votre boutique sera créée en touchant le bouton ci-dessous. Vous pourrez toujours modifier chaque information ensuite."
      submitLabel="Créer et publier ma boutique"
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
          {missing.length === 0 && (
            <p className="v-banner v-banner-info">
              Votre boutique sera créée et mise en ligne tout de suite. Vos commandes arriveront dans « Commandes » : écrivez au client sur WhatsApp, puis touchez « Valider ».
            </p>
          )}
        </>
      )}
    </WizardStepForm>
  );
}

/** Lien de la boutique avec boutons Copier et Voir. */
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
      <div className="wizard-next">
        <Link className="btn btn-secondary" href="/dashboard/livraisons">Régler mes zones de livraison</Link>
        <Link className="btn btn-secondary" href="/dashboard/produits/nouveau">Ajouter d’autres produits</Link>
        <Link className="btn btn-primary" href="/dashboard">Aller à mon tableau de bord</Link>
      </div>
    </section>
  );
}

/** Écran « Boutique créée » : elle existe mais n'est pas encore en ligne (e-mail à confirmer, produit à ajouter…). */
export function CreatedScreen({
  storeName,
  storeUrl,
  email,
  emailVerified,
  missing,
}: {
  storeName: string;
  storeUrl: string;
  email: string;
  emailVerified: boolean;
  missing: { label: string; href: string }[];
}) {
  return (
    <section aria-labelledby="created-title" className="wizard-card wizard-published">
      <span aria-hidden="true" className="wizard-published-icon"><CheckIcon size={24} /></span>
      <h1 id="created-title">Votre boutique « {storeName} » est créée !</h1>
      <p className="wizard-subtitle">
        Elle n’est pas encore visible par vos clients. Il reste {missing.length > 1 ? "quelques étapes" : "une étape"} avant de la mettre en ligne, à faire quand vous voulez :
      </p>
      {!emailVerified && <EmailConfirmationNotice afterCreation email={email} />}
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
      <div className="wizard-next">
        <Link className="btn btn-secondary" href="/dashboard/produits/nouveau">Ajouter des produits</Link>
        <Link className="btn btn-primary" href="/dashboard">Aller à mon tableau de bord</Link>
      </div>
    </section>
  );
}
