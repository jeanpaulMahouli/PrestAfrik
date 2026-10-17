"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStoreCart } from "@/components/storefront/store-cart-provider";

const bagIcon = (
  <svg aria-hidden="true" fill="none" height="22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="22">
    <path d="M6 7h12l1 13H5L6 7Z" />
    <path d="M9 10V6a3 3 0 0 1 6 0v4" />
  </svg>
);

function useCartCount() {
  const cart = useStoreCart();
  return cart.items.reduce((total, item) => total + item.quantity, 0);
}

/** Icône panier de l'en-tête, avec le nombre d'articles. */
export function StorefrontCartLink({ storeSlug }: { storeSlug: string }) {
  const count = useCartCount();
  return (
    <Link aria-label={`Mon panier${count ? ` : ${count} article${count > 1 ? "s" : ""}` : ", vide"}`} className="sf-cart-icon" href={`/${storeSlug}/panier`}>
      {bagIcon}
      {count > 0 && <span aria-hidden="true" className="sf-cart-count">{count}</span>}
    </Link>
  );
}

/** Barre « Voir mon panier (n) » collée en bas de l'écran sur le catalogue (maquette « Boutique publique »). */
export function StorefrontCartBar({ storeSlug }: { storeSlug: string }) {
  const count = useCartCount();
  const pathname = usePathname();
  const hidden = /\/(panier|commande|suivi)(\/|$)/.test(pathname);
  if (!count || hidden) return null;
  return (
    <div className="sf-cart-bar">
      <Link className="sf-btn sf-btn-primary sf-btn-block" href={`/${storeSlug}/panier`}>
        Voir mon panier ({count})
      </Link>
    </div>
  );
}
