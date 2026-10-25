"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStoreHref } from "@/components/storefront/store-links";

/** Produit ou page absente d'une boutique : affichée dans la vitrine (menu et pied de page de la boutique). */
export default function StoreNotFound() {
  const { slug } = useParams<{ slug: string }>();
  const href = useStoreHref(slug);

  return (
    <main className="sf-not-found">
      <p aria-hidden="true" className="sf-not-found-code">404</p>
      <h1>Cette page n’existe pas ou plus</h1>
      <p>Le produit a peut-être été retiré, ou le lien est incomplet. Le reste de la boutique vous attend !</p>
      <div className="sf-not-found-actions">
        <Link className="sf-btn sf-btn-primary" href={href()}>Voir tous les produits</Link>
        <Link className="sf-btn sf-btn-secondary" href={href("panier")}>Mon panier</Link>
      </div>
    </main>
  );
}
