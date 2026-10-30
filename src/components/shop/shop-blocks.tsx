import { ArrowRight, MapPin, Package, Star, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { countryName } from "@/modules/marketplace/search";
import type { ShopProduct, ShopStore } from "@/modules/marketplace/shop";
import { categoryIcon } from "./category-icons";
import { ShopProductCard } from "./product-card";
import { ScrollRail } from "./shop-widgets";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("");

/** Titre de rubrique : icône, titre, sous-titre, lien « Voir tout ». */
export function ShopSectionHead({ icon: Icon, title, subtitle, href, id, tint, aside }: { icon: LucideIcon; title: string; subtitle?: string; href?: string; id: string; tint?: string; aside?: ReactNode }) {
  return (
    <header className="shop-section-head" style={tint ? ({ "--tint": tint } as React.CSSProperties) : undefined}>
      <span aria-hidden="true" className="shop-section-icon">
        <Icon size={22} strokeWidth={2} />
      </span>
      <div className="shop-section-titles">
        <h2 id={id}>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {aside}
      {href && (
        <a className="shop-section-more" href={href}>
          Voir tout <ArrowRight aria-hidden="true" size={16} />
        </a>
      )}
    </header>
  );
}

/** Rangée défilante de produits. */
export function ProductRail({ products, label, variant }: { products: ShopProduct[]; label: string; variant?: "flash" | "exclusive" }) {
  return (
    <ScrollRail label={label}>
      {products.map((product) => (
        <li key={product.id}>
          <ShopProductCard product={product} variant={variant} />
        </li>
      ))}
    </ScrollRail>
  );
}

/** Grille de produits (pages de résultats). */
export function ProductGrid({ products, label }: { products: ShopProduct[]; label: string }) {
  return (
    <ul aria-label={label} className="shop-grid">
      {products.map((product, index) => (
        <li key={product.id}>
          <ShopProductCard priority={index < 4} product={product} />
        </li>
      ))}
    </ul>
  );
}

/** Grande carte de boutique « à la une » : bandeau à la couleur de l'activité, logo, note, nombre de produits. */
export function FeaturedStoreCard({ store }: { store: ShopStore }) {
  const { icon: Icon, tint } = categoryIcon(store.activitySlug);
  return (
    <a className="shop-store-card" href={store.href} style={{ "--tint": tint } as React.CSSProperties}>
      <span aria-hidden="true" className="shop-store-cover">
        <Icon size={64} strokeWidth={1.3} />
      </span>
      <span aria-hidden="true" className="shop-store-logo">
        {/* Logo déjà optimisé (WebP carré). */}
        {store.logoUrl ? <img alt="" height={72} loading="lazy" src={store.logoUrl} width={72} /> : initials(store.name)}
      </span>
      <strong>{store.name}</strong>
      <small>
        <MapPin aria-hidden="true" size={13} /> {[store.city, countryName(store.country)].filter(Boolean).join(", ")}
      </small>
      <span className="shop-store-meta">
        {store.rating !== null && (
          <span>
            <Star aria-hidden="true" fill="currentColor" size={13} /> {store.rating.toLocaleString("fr-FR")}
          </span>
        )}
        <span>
          <Package aria-hidden="true" size={13} /> {store.productCount} produit{store.productCount > 1 ? "s" : ""}
        </span>
      </span>
      {store.activity && <span className="shop-store-activity">{store.activity}</span>}
    </a>
  );
}

/** Carré de boutique (liste de toutes les boutiques) : logo, nom, localisation, activité. */
export function StoreTile({ store }: { store: ShopStore }) {
  return (
    <a className="store-tile" href={store.href}>
      <span aria-hidden="true" className="store-tile-logo">
        {store.logoUrl ? <img alt="" height={72} loading="lazy" src={store.logoUrl} width={72} /> : initials(store.name)}
      </span>
      <strong>{store.name}</strong>
      <small>
        <MapPin aria-hidden="true" size={13} /> {[store.city, countryName(store.country)].filter(Boolean).join(", ")}
      </small>
      {store.activity && <span className="store-tile-activity">{store.activity}</span>}
    </a>
  );
}
