"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StoreImage } from "@/components/ui/store-image";

export type StorePopupData = { id: string; imageUrl: string; altText: string; href: string | null };

/** Contenu visuel du popup (image, bouton X) : partagé par la boutique et l'aperçu du tableau de bord. */
export function PopupCard({ popup, onClose, imageNode }: { popup: StorePopupData; onClose?: () => void; imageNode?: ReactNode }) {
  const image = imageNode ?? <StoreImage alt={popup.altText} fill priority sizes="(max-width: 640px) 90vw, 420px" src={popup.imageUrl} />;
  return (
    <div className="sf-popup-card">
      <button aria-label="Fermer" className="sf-popup-close" onClick={onClose} type="button">
        <X aria-hidden="true" size={22} />
      </button>
      {popup.href ? (
        <Link className="sf-popup-media" href={popup.href} onClick={onClose}>
          {image}
        </Link>
      ) : (
        <span className="sf-popup-media">{image}</span>
      )}
    </div>
  );
}

const delayMs = 1000;

/**
 * Popup d'accueil : affiché environ 1 s après l'ouverture de la boutique, une seule fois par visite
 * (sessionStorage). Fermeture par le X, le fond ou Échap ; focus gardé dans le popup.
 */
export function StorePopup({ storeId, popup }: { storeId: string; popup: StorePopupData }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const storageKey = `prestafrik-popup:${storeId}:${popup.id}`;

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
    } catch {
      // Stockage indisponible (navigation privée stricte) : le popup s'affiche quand même.
    }
    const timer = window.setTimeout(() => {
      setOpen(true);
      try {
        window.sessionStorage.setItem(storageKey, "1");
      } catch {
        // Sans stockage, il pourra réapparaître : rien de bloquant.
      }
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>(".sf-popup-close")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab" && dialog) {
        const items = [...dialog.querySelectorAll<HTMLElement>("a[href], button")];
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="sf-popup-backdrop" onClick={() => setOpen(false)}>
      <div aria-label={popup.altText} aria-modal="true" className="sf-popup" onClick={(event) => event.stopPropagation()} ref={dialogRef} role="dialog">
        <PopupCard onClose={() => setOpen(false)} popup={popup} />
      </div>
    </div>
  );
}
