"use client";

import Link from "next/link";
import { useCartPricing } from "@/components/storefront/use-cart-pricing";
import { formatXaf } from "@/modules/catalog/format";
import { BackIcon } from "@/components/ui/icons";

/** Panier (maquette « Panier ») : quantités, retrait d'un article, sous-total. */
export function StoreCartPage({ storeSlug }: { storeSlug: string }) {
  const { cart, lines, subtotal, loading, error, retry } = useCartPricing(storeSlug);
  const home = `/${storeSlug}`;
  const count = lines.reduce((total, line) => total + line.quantity, 0);

  return (
    <main className="sf-page">
      <div className="sf-page-head">
        <Link aria-label="Retour au catalogue" className="sf-back" href={home}><BackIcon size={18} /></Link>
        <h1>Mon panier</h1>
      </div>

      {error && (
        <div className="sf-notice sf-notice-error" role="alert">
          <p>{error}</p>
          <button className="sf-btn sf-btn-secondary" onClick={retry} type="button">Réessayer</button>
        </div>
      )}

      {loading ? (
        <p aria-live="polite" className="sf-muted">Vérification des prix…</p>
      ) : lines.length === 0 ? (
        <section className="sf-empty">
          <h2>Votre panier est vide</h2>
          <p>Ajoutez des produits pour passer commande.</p>
          <Link className="sf-btn sf-btn-primary" href={home}>Voir les produits</Link>
        </section>
      ) : (
        <>
          <ul className="sf-lines">
            {lines.map((line) => (
              <li key={`${line.productId}:${line.variantId ?? ""}`}>
                <span className="sf-line-name">
                  <strong>{line.productName}</strong>
                  {line.variantName && <small>{line.variantName}</small>}
                  <small>{formatXaf(line.unitPriceXaf)} l’unité</small>
                </span>
                <span className="sf-line-end">
                  <span aria-label={`Quantité de ${line.productName}`} className="sf-stepper sf-stepper-sm" role="group">
                    <button
                      aria-label={line.quantity === 1 ? `Retirer ${line.productName}` : "Retirer un"}
                      onClick={() => cart.changeQuantity(line.productId, line.variantId, line.quantity - 1)}
                      type="button"
                    >
                      −
                    </button>
                    <output>{line.quantity}</output>
                    <button aria-label="Ajouter un" disabled={line.quantity >= 25} onClick={() => cart.changeQuantity(line.productId, line.variantId, line.quantity + 1)} type="button">+</button>
                  </span>
                  <strong>{formatXaf(line.lineTotalXaf)}</strong>
                  <button className="sf-link sf-line-remove" onClick={() => cart.remove(line.productId, line.variantId)} type="button">
                    Retirer
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <dl className="sf-sums">
            <div>
              <dt>Sous-total ({count} article{count > 1 ? "s" : ""})</dt>
              <dd>{formatXaf(subtotal)}</dd>
            </div>
          </dl>
          <p className="sf-muted">Les frais de livraison s’affichent à l’étape suivante, avant de commander. Paiement à la livraison.</p>
          <div className="sf-actions-sticky">
            <Link className="sf-btn sf-btn-primary sf-btn-block" href={`${home}/commande`}>Commander</Link>
            <Link className="sf-btn sf-btn-secondary sf-btn-block" href={home}>Continuer mes achats</Link>
          </div>
        </>
      )}
    </main>
  );
}
