"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { SocialShare } from "@/components/shared/social-share";
import { CopyButton } from "@/components/ui/copy-button";
import { WizardStepForm } from "@/components/wizard/wizard-step-form";
import { publishFromWizard } from "@/modules/stores/wizard-actions";
import { CheckIcon } from "@/components/ui/icons";

type RecapItem = { label: string; value: string; step: number; done: boolean };

export function PublishStep({ storeId, recap, missing, askDeliveryFee, city }: { storeId: string; recap: RecapItem[]; missing: { label: string; href: string }[]; askDeliveryFee: boolean; city: string }) {
  return (
    <WizardStepForm
      action={publishFromWizard}
      backHref={`/boutiques/nouvelle?boutique=${storeId}&etape=7`}
      storeId={storeId}
      subtitle="Vérifiez ce récapitulatif. Après la publication, vous pourrez toujours modifier chaque information."
      submitLabel="Publier ma boutique"
      title="Tout est prêt, on publie ?"
    >
      {(fieldError) => (
        <>
          <ul className="wizard-recap">
            {recap.map((item) => (
              <li className={item.done ? "is-done" : ""} key={item.label}>
                <span aria-hidden="true" className="wizard-recap-dot">{item.done ? <CheckIcon size={11} /> : "!"}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.value}</small>
                </span>
                <Link href={`/boutiques/nouvelle?boutique=${storeId}&etape=${item.step}`}>Modifier</Link>
              </li>
            ))}
          </ul>
          {askDeliveryFee && (
            <label className="v-field">
              Frais de livraison à {city} (FCFA)
              <input inputMode="numeric" maxLength={9} name="deliveryFee" placeholder="Ex. 1500 (0 = gratuit)" required />
              <span className={fieldError("deliveryFee") ? "v-field-error" : "v-field-help"}>
                {fieldError("deliveryFee") ?? "Vos clients verront ce prix avant de commander. Vous pourrez ajouter d’autres quartiers ensuite."}
              </span>
            </label>
          )}
          {missing.length > 0 ? (
            <div className="v-banner v-banner-danger" role="alert">
              <strong>Avant de publier :</strong>
              <ul className="publish-missing-list">
                {missing.map((item) => (
                  <li key={item.label}><Link href={item.href}>{item.label}</Link></li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="v-banner v-banner-info">
              Après la publication, vos commandes arriveront dans « Commandes » : écrivez au client sur WhatsApp, puis touchez « Valider ».
            </p>
          )}
        </>
      )}
    </WizardStepForm>
  );
}

/** Écran « Boutique publiée » : lien, QR code téléchargeable, partage, prochaines étapes. */
export function PublishedScreen({ storeName, storeUrl }: { storeName: string; storeUrl: string }) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    QRCode.toDataURL(storeUrl, { width: 600, margin: 1, color: { dark: "#000026", light: "#ffffff" } }).then(setQr).catch(() => setQr(""));
  }, [storeUrl]);
  const display = storeUrl.replace(/^https?:\/\//, "");

  return (
    <section aria-labelledby="published-title" className="wizard-card wizard-published">
      <span aria-hidden="true" className="wizard-published-icon"><CheckIcon size={24} /></span>
      <h1 id="published-title">Félicitations, votre boutique prend vie !</h1>
      <p className="wizard-subtitle">
        Elle est maintenant visible par vos clients. Partagez-la sans attendre : le premier client est peut-être déjà en train de la chercher.
      </p>
      <label className="v-field">
        Le lien de votre boutique
        <span className="share-link-row">
          <input readOnly value={display} />
          <CopyButton label="Copier" value={storeUrl} />
        </span>
      </label>
      <div className="wizard-published-share">
        <a className="btn btn-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(`Découvrez ma boutique ${storeName} : ${storeUrl}`)}`} rel="noopener noreferrer" target="_blank">
          Partager sur WhatsApp
        </a>
        {qr && (
          <a className="btn btn-secondary" download={`qr-${display.split("/").pop()}.png`} href={qr}>
            Télécharger le QR code
          </a>
        )}
      </div>
      <SocialShare text={`Découvrez ma boutique ${storeName}`} title={storeName} url={storeUrl} />
      <div className="wizard-next">
        <Link className="btn btn-secondary" href="/dashboard/livraisons">Régler mes zones de livraison</Link>
        <Link className="btn btn-secondary" href="/dashboard/produits/nouveau">Ajouter d’autres produits</Link>
        <Link className="btn btn-primary" href="/dashboard">Aller à mon tableau de bord</Link>
      </div>
    </section>
  );
}
