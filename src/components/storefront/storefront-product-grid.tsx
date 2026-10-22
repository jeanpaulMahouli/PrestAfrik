import Link from "next/link";
import { StarRating, reviewCountLabel } from "@/components/storefront/star-rating";
import { StoreImage } from "@/components/ui/store-image";
import { formatXaf } from "@/modules/catalog/format";

type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  priceXaf: number;
  promotionalPriceXaf: number | null;
  images: { url: string; altText: string | null }[];
};

export function ProductPrice({ priceXaf, promotionalPriceXaf }: { priceXaf: number; promotionalPriceXaf: number | null }) {
  if (!promotionalPriceXaf || promotionalPriceXaf >= priceXaf) return <span className="sf-price">{formatXaf(priceXaf)}</span>;
  return (
    <span className="sf-price">
      {formatXaf(promotionalPriceXaf)} <del><span className="visually-hidden">au lieu de </span>{formatXaf(priceXaf)}</del>
    </span>
  );
}

/**
 * Grille du catalogue. Avec `ratings` (boutique qui accepte les avis), chaque carte affiche une ligne
 * d'étoiles et, en dessous, le nombre d'avis.
 */
export function StorefrontProductGrid({
  storeSlug,
  products,
  ratings = null,
}: {
  storeSlug: string;
  products: StoreProduct[];
  ratings?: Record<string, { average: number; count: number }> | null;
}) {
  return (
    <ul className="sf-grid">
      {products.map((product, index) => (
        <li className="sf-card" key={product.id}>
          <Link className="sf-card-link" href={`/${storeSlug}/${product.slug}`}>
            <span className="sf-card-media">
              {product.images[0] ? (
                <StoreImage
                  alt={product.images[0].altText ?? product.name}
                  height={640}
                  priority={index < 4}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  src={product.images[0].url}
                  width={640}
                />
              ) : (
                <span aria-hidden="true" className="sf-card-placeholder" />
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
      ))}
    </ul>
  );
}
