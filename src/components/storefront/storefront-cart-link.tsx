"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStoreCart } from "@/components/storefront/store-cart-provider";
import { useStoreHref } from "@/components/storefront/store-links";
import { ShoppingCart } from "@/components/ui/icons";

const bagIcon = <ShoppingCart aria-hidden="true" size={26} />;

function useCartCount() {
  const cart = useStoreCart();
  return cart.items.reduce((total, item) => total + item.quantity, 0);
}

/** Icône panier de l'en-tête, avec le nombre d'articles. */
export function StorefrontCartLink({ storeSlug }: { storeSlug: string }) {
  const count = useCartCount();
  const link = useStoreHref(storeSlug);
  return (
    <Link aria-label={`Mon panier${count ? ` : ${count} article${count > 1 ? "s" : ""}` : ", vide"}`} className="sf-cart-icon" href={link("panier")}>
      {bagIcon}
      {count > 0 && <span aria-hidden="true" className="sf-cart-count">{count}</span>}
    </Link>
  );
}

/** Barre « Voir mon panier (n) » collée en bas de l'écran sur le catalogue (maquette « Boutique publique »). */
export function StorefrontCartBar({ storeSlug }: { storeSlug: string }) {
  const count = useCartCount();
  const link = useStoreHref(storeSlug);
  const pathname = usePathname();
  const hidden = /\/(panier|commande|suivi)(\/|$)/.test(pathname);
  if (!count || hidden) return null;
  return (
    <div className="sf-cart-bar">
      <Link className="sf-btn sf-btn-primary sf-btn-block" href={link("panier")}>
        Voir mon panier ({count})
      </Link>
    </div>
  );
}
