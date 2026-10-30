import { MapPin, Star, Store } from "lucide-react";
import { storePublicUrl } from "@/lib/urls";
import { formatXaf } from "@/modules/catalog/format";
import { countryName, type getTopProducts, type SearchableStore } from "@/modules/marketplace/search";

/** Carte d'une boutique (page de recherche) : logo, ville, description courte, produits, lien. */
export function StoreCard({ store, products }: { store: SearchableStore; products: Awaited<ReturnType<typeof getTopProducts>> }) {
  const url = storePublicUrl(store.slug);
  const initials = store.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("");
  return (
    <article className="search-card">
      <header className="search-card-head">
        <span aria-hidden="true" className="search-card-logo">
          {/* Logo et miniatures déjà optimisés (WebP) : affichés tels quels. */}
          {store.logoUrl ? <img alt="" height={56} loading="lazy" src={store.logoUrl} width={56} /> : initials || <Store size={22} />}
        </span>
        <div>
          <h2>{store.name}</h2>
          <p className="search-card-place">
            <MapPin aria-hidden="true" size={14} /> {[store.city, countryName(store.country)].filter(Boolean).join(", ")}
            {store.activity ? ` · ${store.activity}` : ""}
          </p>
        </div>
      </header>
      {store.description && <p className="search-card-description">{store.description}</p>}
      {products.length > 0 ? (
        <ul aria-label={`Produits de ${store.name}`} className="search-card-products">
          {products.map((product) => (
            <li key={product.slug}>
              <a href={`${url}/${product.slug}`}>
                <span className="search-card-photo">
                  {product.imageUrl ? <img alt="" height={160} loading="lazy" src={product.imageUrl} width={160} /> : <span aria-hidden="true">{product.name.slice(0, 2).toUpperCase()}</span>}
                </span>
                <span className="search-card-name">{product.name}</span>
                <span className="search-card-price">{formatXaf(product.promotionalPriceXaf ?? product.priceXaf)}</span>
                {product.rating !== null && (
                  <span className="search-card-rating">
                    <Star aria-hidden="true" fill="currentColor" size={12} /> {product.rating.toLocaleString("fr-FR")} ({product.reviewCount} avis)
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="search-card-empty">La boutique prépare son catalogue.</p>
      )}
      <a className="lp-btn lp-btn--primary search-card-cta" href={url}>
        Découvrir la boutique
      </a>
    </article>
  );
}
