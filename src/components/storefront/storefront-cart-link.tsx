"use client";

import Link from "next/link";
import { useStoreCart } from "@/components/storefront/store-cart-provider";

export function StorefrontCartLink({ storeSlug }: { storeSlug: string }) {
  const cart = useStoreCart();
  const quantity = cart.items.reduce((total, item) => total + item.quantity, 0);
  return (
    <Link className="secondary-button storefront-cart-link" href={`/boutique/${storeSlug}/panier`}>
      Voir mon panier{quantity > 0 ? ` (${quantity})` : ""}
    </Link>
  );
}
