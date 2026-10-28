"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { SocialShare } from "@/components/shared/social-share";
import { Dialog } from "@/components/ui/dialog";
import { copyText } from "@/lib/clipboard";

type ShareStoreButtonProps = {
  storeName: string;
  storeUrl: string;
  published: boolean;
  className?: string;
  label?: string;
};

/** Fenêtre de partage de la boutique : lien, QR code téléchargeable, message WhatsApp (brief §6.3). */
export function ShareStoreButton({ storeName, storeUrl, published, className = "btn btn-primary", label = "Partager ma boutique" }: ShareStoreButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={className} onClick={() => setOpen(true)} type="button">
        {label}
      </button>
      <Dialog
        description={published ? "Envoyez ce lien à vos clients ou affichez le QR code dans votre boutique." : "Votre boutique est encore en brouillon : publiez-la pour que vos clients puissent l’ouvrir."}
        onClose={() => setOpen(false)}
        open={open}
        title="Partager ma boutique"
      >
        {open && <ShareStorePanel storeName={storeName} storeUrl={storeUrl} />}
      </Dialog>
    </>
  );
}

/** Contenu du partage (aussi affiché dans la fenêtre « Boutique créée ») : lien à copier, QR code, WhatsApp. */
export function ShareStorePanel({ storeName, storeUrl, compact = false }: { storeName: string; storeUrl: string; compact?: boolean }) {
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const message = `Bonjour ! Découvrez ma boutique ${storeName} : ${storeUrl}\nCommandez en quelques clics, paiement à la livraison.`;

  useEffect(() => {
    QRCode.toDataURL(storeUrl, { width: 480, margin: 1, color: { dark: "#000026", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [storeUrl]);

  async function copy() {
    const done = await copyText(storeUrl);
    setCopied(done);
    setCopyFailed(!done);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="share-store">
      <label className="v-field">
        Lien de votre boutique
        <span className="share-link-row">
          <input onFocus={(event) => event.currentTarget.select()} readOnly value={storeUrl} />
          <button aria-live="polite" className="btn btn-secondary" onClick={copy} type="button">
            {copied ? "Lien copié !" : "Copier"}
          </button>
          <a className="btn btn-primary" href={storeUrl} rel="noopener noreferrer" target="_blank">
            Voir ma boutique
          </a>
        </span>
        {copyFailed && <span className="v-field-help" role="status">Copie automatique bloquée par le navigateur : le lien est sélectionné, faites un appui long puis « Copier ».</span>}
      </label>
      <div className="share-qr">
        {qr ? (
          // L'image est générée localement (data URL), sans service externe.
          <img alt={`QR code de la boutique ${storeName}`} height={compact ? 132 : 180} src={qr} width={compact ? 132 : 180} />
        ) : (
          <span aria-hidden="true" className="v-skeleton share-qr-placeholder" />
        )}
        <div>
          <strong>QR code</strong>
          <p className="v-muted v-small">À imprimer sur vos sacs, cartes de visite ou votre vitrine.</p>
          {qr && (
            <a className="btn btn-secondary btn-sm" download={`qr-${storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`} href={qr}>
              Télécharger le QR code
            </a>
          )}
        </div>
      </div>
      {!compact && (
        <div className="share-preview">
          <strong>Aperçu du message</strong>
          <p>{message}</p>
        </div>
      )}
      <SocialShare text={`Découvrez ma boutique ${storeName} : commandez en quelques clics, paiement à la livraison.`} title={storeName} url={storeUrl} />
    </div>
  );
}
