"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ProductPrice } from "@/components/storefront/storefront-product-grid";
import { useStoreCart } from "@/components/storefront/store-cart-provider";
import { RichText } from "@/components/ui/rich-text";
import { StoreImage } from "@/components/ui/store-image";
import { buildProductWhatsappOrderMessage, buildWaMeUrl } from "@/modules/whatsapp/wa-me";
import { BackIcon } from "@/components/ui/icons";

type ProductDetailProps = {
  storeSlug: string;
  storeName: string;
  productUrl: string;
  whatsappNumber: string | null;
  canOrder?: boolean;
  product: {
    id: string;
    name: string;
    description: string | null;
    priceXaf: number;
    promotionalPriceXaf: number | null;
    trackInventory: boolean;
    stockQuantity: number | null;
    variants: { id: string; sku: string; optionName: string; optionValue: string; priceXaf: number | null; stockQuantity: number | null }[];
    images: { url: string; altText: string | null }[];
  };
};

/** Galerie à faire glisser (jusqu'à 5 photos) avec points de position. */
function Gallery({ images, name }: { images: ProductDetailProps["product"]["images"]; name: string }) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  if (!images.length) return <div aria-hidden="true" className="sf-gallery sf-card-placeholder" />;
  const go = (next: number) => {
    const target = track.current?.children[next] as HTMLElement | undefined;
    target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };
  return (
    <div className="sf-gallery">
      <div
        aria-label={`Photos de ${name}`}
        className="sf-gallery-track"
        onScroll={(event) => {
          const element = event.currentTarget;
          setIndex(Math.round(element.scrollLeft / Math.max(1, element.clientWidth)));
        }}
        ref={track}
        role="region"
        tabIndex={0}
      >
        {images.map((image, imageIndex) => (
          <StoreImage
            alt={image.altText ?? `${name}, photo ${imageIndex + 1}`}
            height={1000}
            key={image.url}
            priority={imageIndex === 0}
            sizes="(max-width: 768px) 100vw, 50vw"
            src={image.url}
            width={1000}
          />
        ))}
      </div>
      {images.length > 1 && (
        <div className="sf-gallery-dots">
          {images.map((image, imageIndex) => (
            <button aria-current={imageIndex === index ? "true" : undefined} aria-label={`Photo ${imageIndex + 1} sur ${images.length}`} key={image.url} onClick={() => go(imageIndex)} type="button" />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductDetail({ product, storeSlug, storeName, productUrl, whatsappNumber, canOrder = true }: ProductDetailProps) {
  const router = useRouter();
  const cart = useStoreCart();
  const available = product.variants.filter((variant) => variant.stockQuantity !== 0);
  const [variantId, setVariantId] = useState(available[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const variant = product.variants.find((item) => item.id === variantId);
  const stock = variant ? variant.stockQuantity : product.trackInventory ? product.stockQuantity : null;
  const maxQuantity = Math.max(1, Math.min(25, stock ?? 25));
  const unitPrice = variant?.priceXaf ?? product.promotionalPriceXaf ?? product.priceXaf;
  const needsVariant = product.variants.length > 0 && !variant;
  const whatsappOrderUrl = whatsappNumber
    ? buildWaMeUrl(
        whatsappNumber,
        buildProductWhatsappOrderMessage({
          storeName,
          productName: product.name,
          variantLabel: variant ? `${variant.optionName} : ${variant.optionValue}` : null,
          quantity,
          unitPriceXaf: unitPrice,
          productUrl,
        }),
      )
    : null;

  function add() {
    if (needsVariant) {
      setMessage(`Choisissez : ${product.variants[0]?.optionName.toLowerCase()}.`);
      return false;
    }
    const added = cart.add({ productId: product.id, variantId: variant?.id ?? null, quantity });
    setMessage(added ? "Ajouté au panier !" : cart.error);
    return added;
  }

  return (
    <main className="sf-product">
      <Link aria-label="Retour au catalogue" className="sf-back" href={`/boutique/${storeSlug}`}><BackIcon size={18} /></Link>
      <Gallery images={product.images} name={product.name} />
      <div className="sf-product-copy">
        <h1>{product.name}</h1>
        {variant?.priceXaf ? <span className="sf-price">{new Intl.NumberFormat("fr-FR").format(variant.priceXaf)} FCFA</span> : <ProductPrice priceXaf={product.priceXaf} promotionalPriceXaf={product.promotionalPriceXaf} />}

        {canOrder && product.variants.length > 0 && (
          <fieldset className="sf-options">
            <legend>{product.variants[0]?.optionName}</legend>
            <div className="sf-chips sf-chips-options">
              {product.variants.map((option) => (
                <button
                  aria-pressed={option.id === variantId}
                  disabled={option.stockQuantity === 0}
                  key={option.id}
                  onClick={() => {
                    setVariantId(option.id);
                    setMessage("");
                  }}
                  type="button"
                >
                  {option.optionValue}
                  {option.stockQuantity === 0 && <span className="visually-hidden"> (épuisé)</span>}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {canOrder && (
          <div className="sf-quantity">
            <span id="sf-quantity-label">Quantité</span>
            <div aria-labelledby="sf-quantity-label" className="sf-stepper" role="group">
              <button aria-label="Retirer un" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} type="button">−</button>
              <output aria-live="polite">{quantity}</output>
              <button aria-label="Ajouter un" disabled={quantity >= maxQuantity} onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} type="button">+</button>
            </div>
            {stock !== null && stock <= 5 && <small>Plus que {stock} en stock</small>}
          </div>
        )}

        {product.description && <RichText className="rich-text sf-description" source={product.description} />}

        {canOrder ? (
          <div className="sf-product-actions">
            {message && <p aria-live="polite" className="sf-toast" role="status">{message}</p>}
            <button
              className="sf-btn sf-btn-primary sf-btn-block"
              disabled={!cart.ready}
              onClick={() => {
                if (add()) router.push(`/boutique/${storeSlug}/commande`);
              }}
              type="button"
            >
              Commander maintenant
            </button>
            <button className="sf-btn sf-btn-secondary sf-btn-block" disabled={!cart.ready} onClick={add} type="button">
              Ajouter au panier
            </button>
            {whatsappOrderUrl && (
              <a className="sf-link sf-whatsapp-link" href={whatsappOrderUrl} rel="noopener noreferrer" target="_blank">
                Une question ? Écrire à la boutique sur WhatsApp
              </a>
            )}
            <p className="sf-muted">Paiement à la livraison. Aucun compte à créer.</p>
          </div>
        ) : (
          <p className="sf-notice">La commande sera possible après la publication de la boutique.</p>
        )}
      </div>
    </main>
  );
}
