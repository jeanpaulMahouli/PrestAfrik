import Link from "next/link";
import { StarRating, reviewCountLabel } from "@/components/storefront/star-rating";
import { storeHref } from "@/lib/store-host";
import { StoreImage } from "@/components/ui/store-image";
import { discountPercent, formatXaf } from "@/modules/catalog/format";

type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  priceXaf: number;
  promotionalPriceXaf: number | null;
  images: { url: string; altText: string | null }[];
  /** Produits en promotion : stock réellement disponible quand le vendeur le suit (sinon absent ou null). */
  stockLeft?: number | null;
};

/** En dessous de ce stock, la carte d'une promotion affiche « Plus que N en stock » et sa jauge. */
const lowStockThreshold = 10;

type Ratings = Record<string, { average: number; count: number }> | null;

export function ProductPrice({ priceXaf, promotionalPriceXaf }: { priceXaf: number; promotionalPriceXaf: number | null }) {
  if (!promotionalPriceXaf || promotionalPriceXaf >= priceXaf) return <span className="sf-price">{formatXaf(priceXaf)}</span>;
  return (
    <span className="sf-price">
      {formatXaf(promotionalPriceXaf)} <del><span className="visually-hidden">au lieu de </span>{formatXaf(priceXaf)}</del>
    </span>
  );
}

/**
 * Carte d'un produit ; `discountBadge` ajoute « -15 % » en haut à gauche de la photo.
 * `promo` ajoute l'économie réalisée et le stock restant : chaque style de promotion (sf-promo-…) choisit ce qu'il montre.
 */
export function ProductCard({
  base,
  product,
  ratings = null,
  priority = false,
  discountBadge = false,
  promo = false,
  className = "sf-card",
}: {
  base: string;
  product: StoreProduct;
  ratings?: Ratings;
  priority?: boolean;
  discountBadge?: boolean;
  promo?: boolean;
  className?: string;
}) {
  const discount = discountBadge || promo ? discountPercent(product) : 0;
  const saving = promo && discount > 0 ? product.priceXaf - (product.promotionalPriceXaf ?? product.priceXaf) : 0;
  const stockLeft = promo && product.stockLeft != null && product.stockLeft > 0 && product.stockLeft <= lowStockThreshold ? product.stockLeft : null;
  return (
    <li className={className}>
      <Link className="sf-card-link" href={storeHref(base, product.slug)}>
        <span className="sf-card-media">
          {product.images[0] ? (
            <StoreImage
              alt={product.images[0].altText ?? product.name}
              height={640}
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              src={product.images[0].url}
              width={640}
            />
          ) : (
            <span aria-hidden="true" className="sf-card-placeholder" />
          )}
          {promo && <span aria-hidden="true" className="sf-card-shine" />}
          {discount > 0 && (
            <span className="sf-discount-badge">
              -{discount} %<span className="visually-hidden"> de réduction</span>
            </span>
          )}
        </span>
        <span className="sf-card-body">
          <strong>{product.name}</strong>
          {ratings && (
            <span className="sf-card-rating">
              <StarRating size={14} value={ratings[product.id]?.average ?? 0} />
              <small>{reviewCountLabel(ratings[product.id]?.count ?? 0)}</small>
            </span>
          )}
          <ProductPrice priceXaf={product.priceXaf} promotionalPriceXaf={product.promotionalPriceXaf} />
          {saving > 0 && <span className="sf-promo-saving">Économisez {formatXaf(saving)}</span>}
          {stockLeft !== null && (
            <span className="sf-promo-stock">
              <span aria-hidden="true" className="sf-promo-stock-bar">
                <span style={{ width: `${Math.max(12, (stockLeft / lowStockThreshold) * 100)}%` }} />
              </span>
              <small>Plus que {stockLeft} en stock</small>
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

/**
 * Grille du catalogue. Avec `ratings` (boutique qui accepte les avis), chaque carte affiche une ligne
 * d'étoiles et, en dessous, le nombre d'avis.
 */
export function StorefrontProductGrid({
  base,
  products,
  ratings = null,
  discountBadge = false,
  promo = false,
  eager = 4,
}: {
  /** Début des liens de la boutique (storeBasePath). */
  base: string;
  products: StoreProduct[];
  ratings?: Ratings;
  discountBadge?: boolean;
  /** Cartes de promotion (voir ProductCard). */
  promo?: boolean;
  /** Nombre de premières photos chargées sans attendre (0 pour une grille plus bas dans la page). */
  eager?: number;
}) {
  return (
    <ul className="sf-grid">
      {products.map((product, index) => (
        <ProductCard base={base} discountBadge={discountBadge} key={product.id} promo={promo} priority={index < eager} product={product} ratings={ratings} />
      ))}
    </ul>
  );
}
