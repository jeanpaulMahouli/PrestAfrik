"use client";

import { ChevronLeft, ChevronRight, MessageCircle, ShieldCheck, Sparkles, Tag, Truck, X, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StarRating, reviewCountLabel } from "@/components/storefront/star-rating";
import { ProductPrice } from "@/components/storefront/storefront-product-grid";
import { useStoreCart } from "@/components/storefront/store-cart-provider";
import { RichText } from "@/components/ui/rich-text";
import { StoreImage } from "@/components/ui/store-image";
import { buildProductWhatsappOrderMessage, buildWaMeUrl } from "@/modules/whatsapp/wa-me";
import { BackIcon } from "@/components/ui/icons";
import { useStoreHref } from "@/components/storefront/store-links";

type ProductDetailProps = {
  storeSlug: string;
  storeName: string;
  productUrl: string;
  whatsappNumber: string | null;
  canOrder?: boolean;
  /** Note des visiteurs (null quand la boutique a désactivé les avis). */
  rating?: { average: number; count: number } | null;
  /** Sections affichées sous le produit (avis, produits similaires). */
  children?: ReactNode;
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

type GalleryImage = ProductDetailProps["product"]["images"][number];

/** Visionneuse plein écran (élément <dialog> : Échap géré par le navigateur), flèches et touches ← →. */
function Lightbox({ images, name, start, onClose }: { images: GalleryImage[]; name: string; start: number; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState(start);
  const go = (next: number) => setCurrent((next + images.length) % images.length);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const image = images[current];
  return (
    <dialog
      aria-label={`Photos de ${name}`}
      className="sf-lightbox"
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(current + 1);
        if (event.key === "ArrowLeft") go(current - 1);
      }}
      ref={dialogRef}
    >
      <button aria-label="Fermer" autoFocus className="sf-lightbox-close" onClick={() => dialogRef.current?.close()} type="button">
        <X aria-hidden="true" size={24} />
      </button>
      {/* L'image est déjà optimisée (WebP 1600 px) : affichage direct en taille réelle. */}
      <img alt={image.altText ?? `${name}, photo ${current + 1}`} className="sf-lightbox-image" src={image.url} />
      {images.length > 1 && (
        <>
          <button aria-label="Photo précédente" className="sf-gallery-arrow sf-gallery-arrow-prev sf-lightbox-arrow" onClick={() => go(current - 1)} type="button">
            <ChevronLeft aria-hidden="true" size={26} strokeWidth={2.4} />
          </button>
          <button aria-label="Photo suivante" className="sf-gallery-arrow sf-gallery-arrow-next sf-lightbox-arrow" onClick={() => go(current + 1)} type="button">
            <ChevronRight aria-hidden="true" size={26} strokeWidth={2.4} />
          </button>
          <p aria-live="polite" className="sf-lightbox-count">
            {current + 1} / {images.length}
          </p>
        </>
      )}
    </dialog>
  );
}

/** Galerie à faire glisser (jusqu'à 5 photos), avec points de position, flèches au survol ; clic sur la photo pour l'agrandir. */
function Gallery({ images, name }: { images: ProductDetailProps["product"]["images"]; name: string }) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  if (!images.length) return <div aria-hidden="true" className="sf-gallery sf-card-placeholder" />;
  // Défilement de la galerie seule (scrollIntoView pouvait aussi faire bouger la page) ; les flèches bouclent.
  const go = (next: number) => {
    const element = track.current;
    if (!element) return;
    const target = (next + images.length) % images.length;
    element.scrollTo({ left: target * element.clientWidth, behavior: "smooth" });
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
          // Un clic (ou Entrée) sur la photo l'ouvre en grand ; le glissement du doigt reste possible.
          <button aria-label={`Agrandir la photo ${imageIndex + 1}`} className="sf-gallery-slide" key={image.url} onClick={() => setZoomed(true)} type="button">
            <StoreImage
              alt={image.altText ?? `${name}, photo ${imageIndex + 1}`}
              height={1000}
              priority={imageIndex === 0}
              sizes="(max-width: 768px) 100vw, 50vw"
              src={image.url}
              width={1000}
            />
          </button>
        ))}
      </div>
      {zoomed && (
        <Lightbox
          images={images}
          name={name}
          onClose={() => {
            setZoomed(false);
            // Retour du focus sur la photo sans contour visible (toucher) : le clavier le retrouve quand même.
            requestAnimationFrame(() => track.current?.querySelectorAll<HTMLElement>(".sf-gallery-slide")[index]?.focus({ preventScroll: true, focusVisible: false } as FocusOptions));
          }}
          start={index}
        />
      )}
      {images.length > 1 && (
        <>
          <button aria-label="Photo précédente" className="sf-gallery-arrow sf-gallery-arrow-prev" onClick={() => go(index - 1)} type="button">
            <ChevronLeft aria-hidden="true" size={22} strokeWidth={2.4} />
          </button>
          <button aria-label="Photo suivante" className="sf-gallery-arrow sf-gallery-arrow-next" onClick={() => go(index + 1)} type="button">
            <ChevronRight aria-hidden="true" size={22} strokeWidth={2.4} />
          </button>
        </>
      )}
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

export function ProductDetail({ product, storeSlug, storeName, productUrl, whatsappNumber, canOrder = true, rating = null, children }: ProductDetailProps) {
  const router = useRouter();
  const link = useStoreHref(storeSlug);
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
    <main className="sf-product-page">
    <div className="sf-product">
      <Link aria-label="Retour au catalogue" className="sf-back" href={link()}><BackIcon size={18} /></Link>
      <Gallery images={product.images} name={product.name} />
      <div className="sf-product-copy">
        <h1>{product.name}</h1>
        {rating && (
          <a className="sf-product-rating" href="#sf-reviews-title">
            <StarRating size={18} value={rating.average} />
            <span>{rating.count > 0 ? `${rating.average.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} · ${reviewCountLabel(rating.count)}` : "Aucun avis pour le moment"}</span>
          </a>
        )}
        {variant?.priceXaf ? <span className="sf-price">{new Intl.NumberFormat("fr-FR").format(variant.priceXaf)} FCFA</span> : <ProductPrice priceXaf={product.priceXaf} promotionalPriceXaf={product.promotionalPriceXaf} />}
        {!variant?.priceXaf && <ProductDeal priceXaf={product.priceXaf} promotionalPriceXaf={product.promotionalPriceXaf} />}

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
                if (add()) router.push(link("commande"));
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
            <ul className="sf-assurances">
              <li><Truck aria-hidden="true" size={18} /> Paiement à la livraison</li>
              <li><MessageCircle aria-hidden="true" size={18} /> Suivi sur WhatsApp</li>
              <li><ShieldCheck aria-hidden="true" size={18} /> Aucun compte à créer</li>
            </ul>
          </div>
        ) : (
          <p className="sf-notice">La commande sera possible après la publication de la boutique.</p>
        )}
      </div>
    </div>
    {children}
    </main>
  );
}

const dealLabels = [
  { style: "classique", text: "Promotion" },
  { style: "vente-flash", text: "Vente flash" },
  { style: "offres-du-jour", text: "Offre du jour" },
  { style: "eclat", text: "Promo en or" },
] as const;

/**
 * Bandeau de la réduction sur la fiche produit, au style des promotions choisi dans « Apparence » (classe
 * sf-promo-… de la vitrine) : le même que la rangée « Promotions » de l'accueil.
 */
function ProductDeal({ priceXaf, promotionalPriceXaf }: { priceXaf: number; promotionalPriceXaf: number | null }) {
  if (!promotionalPriceXaf || promotionalPriceXaf >= priceXaf) return null;
  const discount = Math.round((1 - promotionalPriceXaf / priceXaf) * 100);
  return (
    <p className="sf-product-deal">
      <span aria-hidden="true" className="sf-promo-icon">
        <Zap className="sf-promo-icon-vente-flash" size={18} strokeWidth={2.4} />
        <Tag className="sf-promo-icon-offres-du-jour" size={16} strokeWidth={2.4} />
        <Sparkles className="sf-promo-icon-eclat" size={18} strokeWidth={2.2} />
      </span>
      <span className="sf-product-deal-text">
        {dealLabels.map((label) => (
          <strong className={`sf-promo-label sf-promo-label-${label.style}`} key={label.style}>
            {label.text}
          </strong>
        ))}
        <span>Vous économisez {new Intl.NumberFormat("fr-FR").format(priceXaf - promotionalPriceXaf)} FCFA</span>
      </span>
      <span className="sf-product-deal-badge">-{discount} %</span>
    </p>
  );
}
