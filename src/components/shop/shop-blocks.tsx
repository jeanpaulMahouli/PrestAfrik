import { ArrowRight, MapPin, type LucideIcon } from "@/components/ui/icon-set";
import type { ReactNode } from "react";
import { countryName } from "@/modules/marketplace/search";
import type { ShopProduct, ShopStore } from "@/modules/marketplace/shop";
import { ShopProductCard } from "./product-card";
import { ScrollRail } from "./shop-widgets";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("");

/** Titre de rubrique : icône (facultative), titre, sous-titre, lien « Voir tout ». */
export function ShopSectionHead({ icon: Icon, title, subtitle, href, id, tint, aside, moreLabel = "Voir tout", level = 2 }: { icon?: LucideIcon; title: ReactNode; subtitle?: string; href?: string; id: string; tint?: string; aside?: ReactNode; moreLabel?: string; /** 1 : titre principal de la page (pages de résultats). */ level?: 1 | 2 }) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <header className="shop-section-head" style={tint ? ({ "--tint": tint } as React.CSSProperties) : undefined}>
      {Icon && (
        <span aria-hidden="true" className="shop-section-icon">
          <Icon size={22} strokeWidth={2} />
        </span>
      )}
      <div className="shop-section-titles">
        <Heading id={id}>{title}</Heading>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {aside}
      {href && (
        <a className="shop-section-more" href={href}>
          {moreLabel} <ArrowRight aria-hidden="true" size={16} />
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
