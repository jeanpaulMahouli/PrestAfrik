"use client";

import { Search, X } from "@/components/ui/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDismiss } from "@/components/ui/use-dismiss";
import { useStoreHref } from "@/components/storefront/store-links";
import { StoreSearchInput } from "@/components/storefront/store-search-input";

/**
 * Loupe de l'en-tête, juste avant le panier (thème « Galerie », où la barre de recherche de la page est masquée).
 * Un clic ouvre le champ sous l'en-tête ; Échap ou un clic à côté le referme.
 */
export function StorefrontHeaderSearch({ storeSlug }: { storeSlug: string }) {
  const [open, setOpen] = useState(false);
  const link = useStoreHref(storeSlug);
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
        <form action={link()} className="sf-header-search-panel" role="search">
          <label className="visually-hidden" htmlFor="sf-header-search-input">
            Rechercher un produit
          </label>
          <StoreSearchInput id="sf-header-search-input" inputRef={inputRef} storeSlug={storeSlug} />
          <button className="sf-btn sf-btn-primary" type="submit">
            Rechercher
          </button>
        </form>
      )}
    </div>
  );
}
