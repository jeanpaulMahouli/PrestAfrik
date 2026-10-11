"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { formatXaf } from "@/modules/catalog/format";
import { useStoreCart } from "@/components/storefront/store-cart-provider";

type ProductDetailProps = {
  storeSlug: string;
  product: {
    id: string;
    name: string;
    description: string | null;
    priceXaf: number;
    promotionalPriceXaf: number | null;
    availability: string;
    variants: {
      id: string;
      sku: string;
      optionName: string;
      optionValue: string;
      priceXaf: number | null;
      stockQuantity: number | null;
    }[];
    images: { url: string; altText: string | null }[];
  };
};

export function ProductDetail({ product, storeSlug, canOrder = true }: ProductDetailProps & { canOrder?: boolean }) {
  const cart = useStoreCart();
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const variant = product.variants.find((item) => item.id === variantId);
  const price = variant?.priceXaf ?? product.promotionalPriceXaf ?? product.priceXaf;

  function addToCart() {
    const added = cart.add({
      productId: product.id,
      variantId: variant?.id ?? null,
      quantity,
    });
    setMessage(added ? "Produit ajouté au panier." : "");
    return added;
  }

  return (
    <main className="storefront-content">
      <Link className="text-link" href={`/boutique/${storeSlug}`}>Retour à la boutique</Link>
      <article className="storefront-product-detail">
        {product.images[0] ? (
          <Image
            alt={product.images[0].altText ?? product.name}
            className="product-detail-image"
            height={1000}
            sizes="(max-width: 760px) 100vw, 50vw"
            src={product.images[0].url}
            width={1000}
          />
        ) : (
          <span aria-hidden="true" className="product-detail-placeholder" />
        )}
        <div className="product-detail-copy">
          <h1>{product.name}</h1>
          <p className="product-detail-price">{formatXaf(price)}</p>
          <p>{product.description || "Contacte la boutique si tu souhaites plus d’informations."}</p>
          {canOrder && product.variants.length > 0 && (
            <label className="form-field">
              {product.variants[0]?.optionName}
              <select onChange={(event) => setVariantId(event.target.value)} value={variantId}>
                {product.variants.map((option) => (
                  <option disabled={option.stockQuantity === 0} key={option.id} value={option.id}>
                    {option.optionValue}{option.stockQuantity === 0 ? " (épuisé)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {canOrder ? (
            <>
              <label className="form-field">
                Quantité
                <input
                  max={Math.min(25, variant?.stockQuantity ?? 25)}
                  min={1}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  type="number"
                  value={quantity}
                />
              </label>
              {cart.error && <p className="form-error" role="alert">{cart.error}</p>}
              {message && <p aria-live="polite" className="notice" role="status">{message}</p>}
              <div className="page-actions">
                <button className="primary-button" disabled={!cart.ready} onClick={addToCart} type="button">
                  Ajouter au panier
                </button>
                <Link
                  aria-disabled={!cart.ready}
                  className="secondary-button"
                  href={`/boutique/${storeSlug}/panier`}
                  onClick={(event) => {
                    if (!cart.ready) {
                      event.preventDefault();
                      return;
                    }
                    if (!addToCart()) event.preventDefault();
                  }}
                >
                  Commander maintenant
                </Link>
              </div>
              <p className="dashboard-copy">Paiement à la livraison. Sans création de compte.</p>
            </>
          ) : (
            <p className="storefront-preview-notice">L’ajout au panier sera disponible après publication.</p>
          )}
        </div>
      </article>
    </main>
  );
}
