import { Flame, Star } from "lucide-react";
import { formatXaf } from "@/modules/catalog/format";
import type { ShopProduct } from "@/modules/marketplace/shop";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("");

/**
 * Carte produit de la marketplace : photo, réduction, nom, boutique, prix (et prix barré), note.
 * Toute la carte ouvre le produit dans la boutique du vendeur (la commande se passe là-bas).
 * `variant` : « flash » ajoute la jauge de stock quand le vendeur suit son stock.
 */
export function ShopProductCard({ product, variant, priority }: { product: ShopProduct; variant?: "flash" | "exclusive"; priority?: boolean }) {
  const lowStock = variant === "flash" && product.stockLeft !== null && product.stockLeft <= 20;
  return (
    <a className={`shop-card${variant ? ` shop-card--${variant}` : ""}`} href={product.href}>
      <span className="shop-card-photo">
        {/* Miniatures déjà optimisées (WebP 320 px) : affichées telles quelles. */}
        {product.imageUrl ? (
          <img alt="" decoding="async" height={320} loading={priority ? "eager" : "lazy"} src={product.imageUrl} width={320} />
        ) : (
          <span aria-hidden="true" className="shop-card-placeholder">
            {product.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        {product.discount ? <span className="shop-card-discount">−{product.discount} %</span> : null}
        {variant === "exclusive" && <span className="shop-card-exclusive">Exclusif</span>}
      </span>
      <span className="shop-card-body">
        <span className="shop-card-name">{product.name}</span>
        <span className="shop-card-prices">
          <strong>{formatXaf(product.priceXaf)}</strong>
          {product.oldPriceXaf ? <s>{formatXaf(product.oldPriceXaf)}</s> : null}
        </span>
        {product.rating !== null ? (
          <span className="shop-card-rating">
            <Star aria-hidden="true" fill="currentColor" size={13} /> {product.rating.toLocaleString("fr-FR")} <small>({product.reviewCount})</small>
          </span>
        ) : null}
        {lowStock && (
          <span className="shop-card-stock">
            <Flame aria-hidden="true" size={13} /> Plus que {product.stockLeft}
            <span aria-hidden="true" className="shop-card-stock-bar">
              <span style={{ width: `${Math.max(8, Math.min(100, (product.stockLeft! / 20) * 100))}%` }} />
            </span>
          </span>
        )}
        <span className="shop-card-store">
          <span aria-hidden="true" className="shop-card-store-logo">
            {product.store.logoUrl ? <img alt="" height={20} loading="lazy" src={product.store.logoUrl} width={20} /> : initials(product.store.name)}
          </span>
          {product.store.name}
        </span>
      </span>
    </a>
  );
}
