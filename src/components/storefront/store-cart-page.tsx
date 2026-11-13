"use client";

import Link from "next/link";
import { useStoreHref } from "@/components/storefront/store-links";
import { useCartPricing } from "@/components/storefront/use-cart-pricing";
import { Minus, Plus, X } from "@/components/ui/icons";
import { StoreImage } from "@/components/ui/store-image";
import { formatXaf } from "@/modules/catalog/format";

/** Panier (maquette « Shopping Cart ») : articles à gauche, récapitulatif à droite sur ordinateur. */
export function StoreCartPage({ storeSlug }: { storeSlug: string }) {
  const { cart, lines, subtotal, loading, error, retry } = useCartPricing(storeSlug);
  const link = useStoreHref(storeSlug);
  const home = link();
  const count = lines.reduce((total, line) => total + line.quantity, 0);

  return (
    <main className="sf-page sf-cart-page">
      <h1>Mon panier</h1>

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
        <div className="sf-cart-layout">
          <ul className="sf-cart-lines">
            {lines.map((line) => (
              <li className="sf-cart-line" key={`${line.productId}:${line.variantId ?? ""}`}>
                <span className="sf-cart-thumb">
                  {line.imageUrl ? <StoreImage alt="" height={160} sizes="80px" src={line.imageUrl} width={160} /> : <span aria-hidden="true" className="sf-card-placeholder" />}
                </span>
                <span className="sf-cart-info">
                  {line.productSlug ? <Link href={link(line.productSlug)}>{line.productName}</Link> : <strong>{line.productName}</strong>}
                  {line.variantName && <small>{line.variantName}</small>}
                  <small>{line.sku ? `#${line.sku}` : `${formatXaf(line.unitPriceXaf)} l’unité`}</small>
                </span>
                <span aria-label={`Quantité de ${line.productName}`} className="sf-cart-qty" role="group">
                  <button
                    aria-label={line.quantity === 1 ? `Retirer ${line.productName}` : "Retirer un"}
                    onClick={() => cart.changeQuantity(line.productId, line.variantId, line.quantity - 1)}
                    type="button"
                  >
                    <Minus aria-hidden="true" size={16} />
                  </button>
                  <output>{line.quantity}</output>
                  <button aria-label="Ajouter un" disabled={line.quantity >= 25} onClick={() => cart.changeQuantity(line.productId, line.variantId, line.quantity + 1)} type="button">
                    <Plus aria-hidden="true" size={16} />
                  </button>
                </span>
                <strong className="sf-cart-total">{formatXaf(line.lineTotalXaf)}</strong>
                <button aria-label={`Retirer ${line.productName} du panier`} className="sf-cart-remove" onClick={() => cart.remove(line.productId, line.variantId)} type="button">
                  <X aria-hidden="true" size={20} />
                </button>
              </li>
            ))}
          </ul>

          <aside aria-labelledby="sf-cart-summary" className="sf-cart-summary">
            <h2 id="sf-cart-summary">Récapitulatif</h2>
            <dl className="sf-sums">
              <div>
                <dt>Sous-total ({count} article{count > 1 ? "s" : ""})</dt>
                <dd>{formatXaf(subtotal)}</dd>
              </div>
              <div>
                <dt>Livraison</dt>
                <dd className="sf-muted-inline">Calculée à l’étape suivante</dd>
              </div>
              <div className="sf-sums-total">
                <dt>Total</dt>
                <dd>{formatXaf(subtotal)}</dd>
              </div>
            </dl>
            <p className="sf-muted">Vous payez à la livraison, au moment de recevoir votre commande.</p>
            <div className="sf-actions-sticky">
              <Link className="sf-btn sf-btn-primary sf-btn-block" href={link("commande")}>Commander</Link>
              <Link className="sf-continue-link" href={home}>Continuer mes achats</Link>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
