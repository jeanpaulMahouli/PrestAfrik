"use client";

import { Check, Copy, FacebookLogo, TelegramLogo } from "@phosphor-icons/react";
import { useState } from "react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

/** Partage d'un produit avec les logos d'origine (couleurs des marques) : WhatsApp, Facebook, Telegram, lien. */
export function ProductShare({ name, url }: { name: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const text = encodeURIComponent(`${name} : ${url}`);

  return (
    <div className="sf-share">
      <span>Partager</span>
      <a aria-label="Partager sur WhatsApp" className="sf-share-btn" href={`https://wa.me/?text=${text}`} rel="noopener noreferrer" target="_blank">
        <WhatsAppIcon size={26} variant="logo" />
      </a>
      <a aria-label="Partager sur Facebook" className="sf-share-btn" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} rel="noopener noreferrer" target="_blank">
        <FacebookLogo aria-hidden="true" color="#1877F2" size={28} weight="fill" />
      </a>
      <a aria-label="Partager sur Telegram" className="sf-share-btn" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(name)}`} rel="noopener noreferrer" target="_blank">
        <TelegramLogo aria-hidden="true" color="#26A5E4" size={28} weight="fill" />
      </a>
      <button
        aria-label={copied ? "Lien copié" : "Copier le lien"}
        className="sf-share-btn"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
        type="button"
      >
        {copied ? <Check aria-hidden="true" size={22} /> : <Copy aria-hidden="true" size={22} />}
      </button>
    </div>
  );
}
