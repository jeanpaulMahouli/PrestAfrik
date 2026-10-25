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
};

type Ratings = Record<string, { average: number; count: number }> | null;

export function ProductPrice({ priceXaf, promotionalPriceXaf }: { priceXaf: number; promotionalPriceXaf: number | null }) {
  if (!promotionalPriceXaf || promotionalPriceXaf >= priceXaf) return <span className="sf-price">{formatXaf(priceXaf)}</span>;
  return (
    <span className="sf-price">
      {formatXaf(promotionalPriceXaf)} <del><span className="visually-hidden">au lieu de </span>{formatXaf(priceXaf)}</del>
    </span>
  );
}

/** Carte d'un produit ; `discountBadge` ajoute « -15 % » en haut à gauche de la photo. */
export function ProductCard({
  base,
  product,
  ratings = null,
  priority = false,
  discountBadge = false,
  className = "sf-card",
}: {
  base: string;
  product: StoreProduct;
  ratings?: Ratings;
  priority?: boolean;
  discountBadge?: boolean;
  className?: string;
}) {
  const discount = discountBadge ? discountPercent(product) : 0;
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
  eager = 4,
}: {
  /** Début des liens de la boutique (storeBasePath). */
  base: string;
  products: StoreProduct[];
  ratings?: Ratings;
  discountBadge?: boolean;
  /** Nombre de premières photos chargées sans attendre (0 pour une grille plus bas dans la page). */
  eager?: number;
}) {
  return (
    <ul className="sf-grid">
      {products.map((product, index) => (
        <ProductCard base={base} discountBadge={discountBadge} key={product.id} priority={index < eager} product={product} ratings={ratings} />
      ))}
    </ul>
  );
}
