import { Eye, Fire, Star, Storefront } from "@phosphor-icons/react/ssr";
import { formatXaf } from "@/modules/catalog/format";
import type { ShopProduct } from "@/modules/marketplace/shop";

/** Note sur 5 en étoiles, avec le nombre d'avis (seulement quand des avis approuvés existent). */
export function Stars({ rating, count, size = 16 }: { rating: number; count: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <span aria-label={`Note ${rating.toLocaleString("fr-FR")} sur 5, ${count} avis`} className="sx-stars" role="img">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star aria-hidden="true" key={star} size={size} weight={star <= full ? "fill" : "regular"} />
      ))}
      <small aria-hidden="true">({count})</small>
    </span>
  );
}

/** Pastille de la carte : réduction, exclusivité. */
export function ProductBadges({ product, exclusive = false }: { product: ShopProduct; exclusive?: boolean }) {
  if (!product.discount && !exclusive) return null;
  return (
    <span className="sx-badges">
      {product.discount ? <span className="sx-badge sx-badge--deal">−{product.discount} %</span> : null}
      {exclusive && <span className="sx-badge sx-badge--exclusive">Exclusif</span>}
    </span>
  );
}

/**
 * Carte produit de la marketplace (maquette) : cadre fin, photo, note, nom sur deux lignes, prix barré et
 * prix payé. Toute la carte ouvre la fiche produit de la marketplace ; au survol, deux boutons ronds :
 * « Voir le produit » et « Voir la boutique » du vendeur.
 * `variant` : « flash » ajoute la jauge de stock quand le vendeur suit son stock.
 */
export function ShopProductCard({ product, variant, priority }: { product: ShopProduct; variant?: "flash" | "exclusive"; priority?: boolean }) {
  const lowStock = variant === "flash" && product.stockLeft !== null && product.stockLeft <= 20;
  return (
    <article className={`shop-card${variant ? ` shop-card--${variant}` : ""}`}>
      <span className="shop-card-photo">
        {/* Miniatures déjà optimisées (WebP 320 px) : affichées telles quelles. */}
        {product.imageUrl ? (
          <img alt="" decoding="async" height={320} loading={priority ? "eager" : "lazy"} src={product.imageUrl} width={320} />
        ) : (
          <span aria-hidden="true" className="shop-card-placeholder">
            {product.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <ProductBadges exclusive={variant === "exclusive"} product={product} />
        <span className="shop-card-actions">
          <a aria-label={`Voir ${product.name}`} className="sx-round" href={product.href} tabIndex={-1}>
            <Eye aria-hidden="true" size={22} />
          </a>
          <a aria-label={`Voir la boutique ${product.store.name}`} className="sx-round" href={product.store.href}>
            <Storefront aria-hidden="true" size={22} />
          </a>
        </span>
      </span>
      <span className="shop-card-body">
        {product.rating !== null && <Stars count={product.reviewCount} rating={product.rating} size={14} />}
        <a className="shop-card-name" href={product.href}>
          {product.name}
        </a>
        <span className="sx-price">
          {product.oldPriceXaf ? <s>{formatXaf(product.oldPriceXaf)}</s> : null}
          <strong>{formatXaf(product.priceXaf)}</strong>
        </span>
        {lowStock && (
          <span className="shop-card-stock">
            <Fire aria-hidden="true" size={14} /> Plus que {product.stockLeft}
          </span>
        )}
        <span className="shop-card-store">{product.store.name}</span>
      </span>
    </article>
  );
}
