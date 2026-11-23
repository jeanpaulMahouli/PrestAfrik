"use client";

import { Check, ShareNetwork } from "@phosphor-icons/react";
import { useState } from "react";

/** « Partager » : partage natif du téléphone, sinon copie du lien de la boutique. */
export function StoreShareButton({ name, url }: { name: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch {
        // Partage annulé : rien à faire.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copie refusée par le navigateur : le lien reste dans la barre d'adresse.
    }
  }

  return (
    <button aria-label={`Partager la boutique ${name}`} className="sf-btn sf-btn-secondary sf-store-card-share" onClick={share} type="button">
      {copied ? <Check aria-hidden="true" size={18} /> : <ShareNetwork aria-hidden="true" size={18} />}
      <span>{copied ? "Lien copié" : "Partager"}</span>
    </button>
  );
}
