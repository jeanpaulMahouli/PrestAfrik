"use client";

import { ArrowLeft, ArrowRight, CaretDown, Check, CheckCircle, Copy, FacebookLogo, Heart, MagnifyingGlassPlus, Minus, Plus, ShoppingCartSimple, Star, Storefront, X } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { StoreCartProvider, useStoreCart } from "@/components/storefront/store-cart-provider";
import { formatXaf } from "@/modules/catalog/format";
import { toggleProductLike } from "@/modules/marketplace/like-actions";
import { submitReview, type ReviewFormState } from "@/modules/reviews/actions";
import { rememberCartStore, type CartStore } from "./market-cart";
import { WhatsappMark } from "./whatsapp-mark";

type Variant = { id: string; optionName: string; optionValue: string; priceXaf: number | null; stockQuantity: number | null };
type GalleryImage = { url: string; altText: string | null };

const size = (url: string, width: 320 | 800 | 1600) => url.replace(/-(320|800|1600)\.webp$/, `-${width}.webp`);

/** Visionneuse (fenêtre <dialog>) : grande photo, flèches, touches ← → ; Échap, « Fermer » ou un clic à côté la ferment. */
function Lightbox({ images, name, start, onClose }: { images: GalleryImage[]; name: string; start: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState(start);
  const go = (next: number) => setCurrent((next + images.length) % images.length);
  useEffect(() => ref.current?.showModal(), []);
  const image = images[current];
  return (
    <dialog
      aria-label={`Photos de ${name}`}
      className="sx-lightbox"
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(current + 1);
        if (event.key === "ArrowLeft") go(current - 1);
      }}
      ref={ref}
    >
      <button aria-label="Fermer" autoFocus className="sx-round sx-lightbox-close" onClick={() => ref.current?.close()} type="button">
        <X aria-hidden="true" size={22} />
      </button>
      {/* Photo en grande taille (WebP 1600 px). */}
      <img alt={image.altText ?? `${name}, photo ${current + 1}`} className="sx-lightbox-image" src={size(image.url, 1600)} />
      {images.length > 1 && (
        <>
          <button aria-label="Photo précédente" className="sx-round sx-round--solid sx-lightbox-prev" onClick={() => go(current - 1)} type="button">
            <ArrowLeft aria-hidden="true" size={20} />
          </button>
          <button aria-label="Photo suivante" className="sx-round sx-round--solid sx-lightbox-next" onClick={() => go(current + 1)} type="button">
            <ArrowRight aria-hidden="true" size={20} />
          </button>
          <p aria-live="polite" className="sx-lightbox-count">
            {current + 1} / {images.length}
          </p>
        </>
      )}
    </dialog>
  );
}

/**
 * Galerie (maquette) : grande photo qui remplit son cadre et que l'on fait glisser du doigt (téléphone) ou
 * avec les flèches et les vignettes ; un toucher l'agrandit dans une fenêtre.
 */
export function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const [current, setCurrent] = useState(0);
  const [start, setStart] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const visible = 6;
  if (!images.length) return <div className="sx-gallery-main sx-gallery-empty">{name.slice(0, 2).toUpperCase()}</div>;
  // Vignette affichée : la fenêtre des vignettes suit la photo courante.
  const select = (value: number) => {
    setCurrent(value);
    setStart((first) => (value < first ? value : value >= first + visible ? value - visible + 1 : first));
  };
  const go = (next: number) => {
    const value = (next + images.length) % images.length;
    select(value);
    const element = track.current;
    if (element) element.scrollTo({ left: value * element.clientWidth, behavior: "smooth" });
  };
  return (
    <div className="sx-gallery">
      <div className="sx-gallery-main">
        <div
          aria-label={`Photos de ${name}`}
          className="sx-gallery-track"
          onScroll={(event) => {
            const element = event.currentTarget;
            const index = Math.round(element.scrollLeft / Math.max(1, element.clientWidth));
            if (index !== current && index >= 0 && index < images.length) select(index);
          }}
          ref={track}
          role="region"
        >
          {images.map((item, index) => (
            <button aria-label={`Agrandir la photo ${index + 1}`} className="sx-gallery-slide" key={item.url} onClick={() => setZoom(index)} type="button">
              <img alt={item.altText ?? `${name}, photo ${index + 1}`} decoding="async" fetchPriority={index === 0 ? "high" : "auto"} height={800} loading={index === 0 ? "eager" : "lazy"} src={size(item.url, 800)} width={800} />
            </button>
          ))}
        </div>
        <span aria-hidden="true" className="sx-gallery-zoom">
          <MagnifyingGlassPlus size={22} />
        </span>
        {images.length > 1 && (
          <span aria-live="polite" className="sx-gallery-count">
            {current + 1} / {images.length}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="sx-thumbs">
          <button aria-label="Photo précédente" className="sx-round sx-round--solid sx-thumbs-prev" onClick={() => go(current - 1)} type="button">
            <ArrowLeft aria-hidden="true" size={20} />
          </button>
          <ul>
            {images.slice(start, start + visible).map((item, offset) => {
              const index = start + offset;
              return (
                <li key={item.url}>
                  <button aria-current={index === current} aria-label={`Afficher la photo ${index + 1}`} onClick={() => go(index)} type="button">
                    <img alt="" height={96} loading="lazy" src={size(item.url, 320)} width={96} />
                  </button>
                </li>
              );
            })}
          </ul>
          <button aria-label="Photo suivante" className="sx-round sx-round--solid sx-thumbs-next" onClick={() => go(current + 1)} type="button">
            <ArrowRight aria-hidden="true" size={20} />
          </button>
        </div>
      )}
      {zoom !== null && <Lightbox images={images} name={name} onClose={() => setZoom(null)} start={zoom} />}
    </div>
  );
}

/** Cœur « J'aime » : un par visiteur ; un second clic l'annule. */
export function LikeButton({ productId, initial }: { productId: string; initial: { count: number; liked: boolean } }) {
  const [state, setState] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <span className="sx-like-wrap">
      <button
        aria-label={state.liked ? "Retirer mon j’aime" : "J’aime ce produit"}
        aria-pressed={state.liked}
        className="sx-like"
        disabled={pending}
        onClick={async () => {
          // Un clic met le j'aime, un autre l'annule (autant de fois que voulu).
          const before = state;
          setPending(true);
          // Affichage immédiat, corrigé par la réponse du serveur.
          setState({ liked: !before.liked, count: Math.max(0, before.count + (before.liked ? -1 : 1)) });
          try {
            const result = await toggleProductLike(productId);
            if ("error" in result) {
              setState(before);
              setMessage(result.error);
            } else {
              setState(result);
              setMessage("");
            }
          } catch {
            // Réseau coupé ou serveur indisponible : le bouton redevient utilisable, dans son état d'avant.
            setState(before);
            setMessage("Connexion interrompue : réessayez.");
          } finally {
            setPending(false);
          }
        }}
        type="button"
      >
        <Heart aria-hidden="true" size={22} weight={state.liked ? "fill" : "regular"} />
        <span>{state.count}</span>
      </button>
      {message && (
        <small className="sx-field-error" role="alert">
          {message}
        </small>
      )}
    </span>
  );
}

/** Choix et boutons d'achat, dans le panier de la boutique (le même que sa vitrine, sur cette adresse). */
function BuyControls({ product, store, productUrl, canOrder, checkoutHref, cartHref }: BuyProps) {
  const router = useRouter();
  const cart = useStoreCart();
  const available = product.variants.filter((variant) => variant.stockQuantity !== 0);
  const [variantId, setVariantId] = useState(available[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState<"" | "ok" | "error">("");
  const variant = product.variants.find((item) => item.id === variantId);
  const stock = variant ? variant.stockQuantity : product.trackInventory ? product.stockQuantity : null;
  const maxQuantity = Math.max(1, Math.min(25, stock ?? 25));
  const needsVariant = product.variants.length > 0 && !variant;
  const options = [...new Set(product.variants.map((item) => item.optionName))];

  const add = () => {
    if (needsVariant) return false;
    rememberCartStore(store);
    const ok = cart.add({ productId: product.id, variantId: variant?.id ?? null, quantity });
    setAdded(ok ? "ok" : "error");
    return ok;
  };

  return (
    <>
      {variant?.priceXaf != null && variant.priceXaf !== (product.promotionalPriceXaf ?? product.priceXaf) && (
        <p className="sx-buy-variant-price">
          Prix pour ce choix : <strong>{formatXaf(variant.priceXaf)}</strong>
        </p>
      )}
      {canOrder && product.variants.length > 0 && (
        <div className="sx-buy-options">
          <label>
            <span>{options.join(" / ")}</span>
            <span className="sx-select">
              <select onChange={(event) => setVariantId(event.target.value)} value={variantId}>
                {product.variants.map((item) => (
                  <option disabled={item.stockQuantity === 0} key={item.id} value={item.id}>
                    {item.optionValue}
                    {item.stockQuantity === 0 ? " (épuisé)" : ""}
                  </option>
                ))}
              </select>
              <CaretDown aria-hidden="true" size={14} />
            </span>
          </label>
        </div>
      )}
      {canOrder ? (
        <div className="sx-buy-actions">
          <div className="sx-qty">
            <button aria-label="Retirer un" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} type="button">
              <Minus aria-hidden="true" size={16} />
            </button>
            <output aria-live="polite">{String(quantity).padStart(2, "0")}</output>
            <button aria-label="Ajouter un" disabled={quantity >= maxQuantity} onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} type="button">
              <Plus aria-hidden="true" size={16} />
            </button>
          </div>
          <button className="sx-btn sx-btn-primary sx-btn-large" disabled={!cart.ready || needsVariant} onClick={() => add() && router.push(checkoutHref)} type="button">
            Commander <ArrowRight aria-hidden="true" size={20} />
          </button>
          <button className="sx-btn sx-btn-outline sx-btn-large" disabled={!cart.ready || needsVariant} onClick={add} type="button">
            Ajouter au panier <ShoppingCartSimple aria-hidden="true" size={20} />
          </button>
        </div>
      ) : (
        <p className="sx-buy-paused">Cette boutique ne prend pas de commande pour le moment.</p>
      )}
      {added === "ok" && (
        <p className="sx-added" role="status">
          <CheckCircle aria-hidden="true" size={20} weight="fill" /> Ajouté au panier.{" "}
          <a href={cartHref}>
            Voir mon panier <ArrowRight aria-hidden="true" size={16} />
          </a>
        </p>
      )}
      {added === "error" && (
        <p className="sx-field-error" role="alert">
          {cart.error || "Le produit n’a pas pu être ajouté au panier."}
        </p>
      )}
      <div className="sx-buy-links">
        <a href={store.href}>
          <Storefront aria-hidden="true" size={20} /> Voir la boutique {store.name}
        </a>
        <span className="sx-share">
          <span>Partager :</span>
          <button
            aria-label={copied ? "Lien copié" : "Copier le lien"}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(productUrl);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              } catch {
                setCopied(false);
              }
            }}
            type="button"
          >
            {copied ? <Check aria-hidden="true" size={20} /> : <Copy aria-hidden="true" size={20} />}
          </button>
          <a aria-label="Partager sur WhatsApp" href={`https://wa.me/?text=${encodeURIComponent(`${product.name} : ${productUrl}`)}`} rel="noopener noreferrer" target="_blank">
            <WhatsappMark size={20} />
          </a>
          <a aria-label="Partager sur Facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`} rel="noopener noreferrer" target="_blank">
            <FacebookLogo aria-hidden="true" size={20} />
          </a>
        </span>
      </div>
    </>
  );
}

type BuyProps = {
  product: { id: string; name: string; priceXaf: number; promotionalPriceXaf: number | null; trackInventory: boolean; stockQuantity: number | null; variants: Variant[] };
  store: CartStore & { href: string };
  productUrl: string;
  canOrder: boolean;
  checkoutHref: string;
  cartHref: string;
};

/**
 * Achat (maquette) : variantes, quantité, « Commander » (ajoute au panier puis ouvre la commande sur la
 * marketplace) et « Ajouter au panier ». Pas de commande directe sur WhatsApp : elle passe par la commande.
 */
export function ProductBuy({ children, ...props }: BuyProps & { children: ReactNode }) {
  return (
    <div className="sx-buy">
      {children}
      <StoreCartProvider storeId={props.store.id}>
        <BuyControls {...props} />
      </StoreCartProvider>
    </div>
  );
}

/** Noter le produit (1 à 5 étoiles et un commentaire) : l'avis est publié tout de suite. */
export function ReviewForm({ productId }: { productId: string }) {
  const [state, dispatch, pending] = useActionState<ReviewFormState, FormData>(submitReview, null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  if (state?.ok) {
    return (
      <p className="sx-added" role="status">
        <CheckCircle aria-hidden="true" size={20} weight="fill" /> {state.message}
      </p>
    );
  }
  return (
    <form
      className="sx-review-form"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => dispatch(data));
      }}
    >
      <h3>Donnez votre note</h3>
      <input name="productId" type="hidden" value={productId} />
      <input name="rating" type="hidden" value={rating || ""} />
      {/* Champ piège pour les robots : invisible pour les visiteurs. */}
      <input aria-hidden="true" autoComplete="off" className="sx-trap" name="website" tabIndex={-1} />
      <fieldset className="sx-rate">
        <legend>Votre note</legend>
        {[1, 2, 3, 4, 5].map((value) => (
          <button aria-label={`${value} étoile${value > 1 ? "s" : ""} sur 5`} aria-pressed={rating === value} key={value} onClick={() => setRating(value)} onMouseEnter={() => setHover(value)} onMouseLeave={() => setHover(0)} type="button">
            <Star aria-hidden="true" size={28} weight={(hover || rating) >= value ? "fill" : "regular"} />
          </button>
        ))}
      </fieldset>
      <label className="sx-field">
        <span>Votre prénom</span>
        <input maxLength={60} name="authorName" required />
      </label>
      <label className="sx-field">
        <span>Votre avis</span>
        <textarea maxLength={1000} minLength={10} name="comment" placeholder="Qualité, livraison, conformité aux photos…" required rows={3} />
      </label>
      {state && !state.ok && (
        <p className="sx-field-error" role="alert">
          {state.message}
        </p>
      )}
      <button className="sx-btn sx-btn-primary" disabled={pending || !rating} type="submit">
        {pending ? "Envoi…" : "Publier mon avis"} <ArrowRight aria-hidden="true" size={20} />
      </button>
    </form>
  );
}

/** Onglets sous la fiche (maquette) : Description, Avis, Livraison et paiement ; flèches gauche et droite. */
export function DetailTabs({ tabs }: { tabs: { id: string; label: string; panel: ReactNode }[] }) {
  const [current, setCurrent] = useState(0);
  const select = (next: number) => {
    const value = (next + tabs.length) % tabs.length;
    setCurrent(value);
    document.getElementById(`sx-detail-tab-${tabs[value].id}`)?.focus();
  };
  useEffect(() => {
    // Lien direct vers les avis (#avis) : l'onglet s'ouvre.
    const open = () => {
      const index = tabs.findIndex((tab) => `#${tab.id}` === window.location.hash);
      if (index >= 0) setCurrent(index);
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [tabs]);
  return (
    <section aria-label="Détails du produit" className="sx-detail" id="details">
      <div aria-label="Détails du produit" className="sx-detail-tabs" role="tablist">
        {tabs.map((tab, index) => (
          <button
            aria-controls={`sx-detail-${tab.id}`}
            aria-selected={index === current}
            id={`sx-detail-tab-${tab.id}`}
            key={tab.id}
            onClick={() => setCurrent(index)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") select(current + 1);
              if (event.key === "ArrowLeft") select(current - 1);
            }}
            role="tab"
            tabIndex={index === current ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div aria-labelledby={`sx-detail-tab-${tab.id}`} className="sx-detail-panel" hidden={index !== current} id={`sx-detail-${tab.id}`} key={tab.id} role="tabpanel">
          {tab.panel}
        </div>
      ))}
    </section>
  );
}
