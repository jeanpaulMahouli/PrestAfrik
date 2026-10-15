"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { SocialShare } from "@/components/shared/social-share";
import { Dialog } from "@/components/ui/dialog";

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
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const message = `Bonjour ! Découvrez ma boutique ${storeName} : ${storeUrl}\nCommandez en quelques clics, paiement à la livraison.`;

  useEffect(() => {
    if (!open || qr) return;
    QRCode.toDataURL(storeUrl, { width: 480, margin: 1, color: { dark: "#000026", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [open, qr, storeUrl]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

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
        <div className="share-store">
          <label className="v-field">
            Lien de votre boutique
            <span className="share-link-row">
              <input readOnly value={storeUrl} />
              <button className="btn btn-secondary" onClick={copy} type="button">
                {copied ? "Lien copié !" : "Copier"}
              </button>
            </span>
          </label>
          <div className="share-qr">
            {qr ? (
              // L'image est générée localement (data URL), sans service externe.
              <img alt={`QR code de la boutique ${storeName}`} height={180} src={qr} width={180} />
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
          <div className="share-preview">
            <strong>Aperçu du message</strong>
            <p>{message}</p>
          </div>
          <SocialShare text={`Découvrez ma boutique ${storeName} : commandez en quelques clics, paiement à la livraison.`} title={storeName} url={storeUrl} />
        </div>
      </Dialog>
    </>
  );
}
