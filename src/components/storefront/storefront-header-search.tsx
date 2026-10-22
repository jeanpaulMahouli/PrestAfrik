"use client";

import { Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDismiss } from "@/components/ui/use-dismiss";

/**
 * Loupe de l'en-tête, juste avant le panier (thème « Galerie », où la barre de recherche de la page est masquée).
 * Un clic ouvre le champ sous l'en-tête ; Échap ou un clic à côté le referme.
 */
export function StorefrontHeaderSearch({ storeSlug }: { storeSlug: string }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss<HTMLDivElement>(open, close);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div className="sf-header-search" ref={ref}>
      <button aria-expanded={open} aria-label={open ? "Fermer la recherche" : "Rechercher un produit"} className="sf-cart-icon" onClick={() => setOpen((value) => !value)} type="button">
        {open ? <X aria-hidden="true" size={22} /> : <Search aria-hidden="true" size={22} />}
      </button>
      {open && (
        <form action={`/${storeSlug}`} className="sf-header-search-panel" role="search">
          <label className="visually-hidden" htmlFor="sf-header-search-input">
            Rechercher un produit
          </label>
          <input id="sf-header-search-input" maxLength={100} name="q" placeholder="Rechercher un produit" ref={inputRef} type="search" />
          <button className="sf-btn sf-btn-primary" type="submit">
            Rechercher
          </button>
        </form>
      )}
    </div>
  );
}
