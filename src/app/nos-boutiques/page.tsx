import { MapPin, Star, Store } from "lucide-react";
import type { Metadata } from "next";
import { LandingButton } from "@/components/landing/buttons";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";
import { VendorSearch } from "@/components/marketplace/vendor-search";
import { storePublicUrl } from "@/lib/urls";
import { formatXaf } from "@/modules/catalog/format";
import { countryName, getMarketplaceTopProducts, getTopStores } from "@/modules/marketplace/search";

export const metadata: Metadata = {
  title: { absolute: "Nos boutiques : trouvez un vendeur PrestAfrik | PrestAfrik" },
  description: "Les boutiques PrestAfrik et leurs produits les mieux notés. Cherchez un vendeur par nom, ville ou activité et commandez sur WhatsApp, paiement à la livraison.",
  alternates: { canonical: "/nos-boutiques" },
};

export const dynamic = "force-dynamic";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("");

/**
 * Toutes nos boutiques : la recherche sous le héros, les 32 produits les mieux notés et les plus visités
 * de toutes les boutiques, puis les boutiques (carrés cliquables : logo, nom, ville, activité).
 */
export default async function StoresPage() {
  const signedIn = await isSignedIn();
  const [stores, products] = await Promise.all([getTopStores(200), getMarketplaceTopProducts(32)]);
  return (
    <PageShell
      className="lp-page--search"
      hero={{
        title: "Nos boutiques",
        subtitle: "Trouvez un vendeur par son nom, sa ville ou son activité. Vous commandez sur sa boutique, il confirme sur WhatsApp, vous payez à la livraison.",
      }}
      signedIn={signedIn}
    >
      <div className="stores-page">
        <VendorSearch bare className="vendor-search--wide" />

        {products.length > 0 && (
          <section aria-label="Produits les mieux notés" className="stores-products">
            <ul className="stores-products-grid">
              {products.map((product) => (
                <li key={`${product.storeSlug}/${product.slug}`}>
                  <a href={`${storePublicUrl(product.storeSlug)}/${product.slug}`}>
                    <span className="search-card-photo">
                      {/* Miniatures déjà optimisées (WebP) : affichées telles quelles. */}
                      {product.imageUrl ? <img alt="" height={160} loading="lazy" src={product.imageUrl} width={160} /> : <span aria-hidden="true">{product.name.slice(0, 2).toUpperCase()}</span>}
                    </span>
                    <span className="search-card-name">{product.name}</span>
                    <span className="search-card-price">{formatXaf(product.promotionalPriceXaf ?? product.priceXaf)}</span>
                    {product.rating !== null && (
                      <span className="search-card-rating">
                        <Star aria-hidden="true" fill="currentColor" size={12} /> {product.rating.toLocaleString("fr-FR")} ({product.reviewCount} avis)
                      </span>
                    )}
                    <span className="visually-hidden">, boutique {product.storeName}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {stores.length > 0 ? (
          <section aria-label="Les boutiques" className="stores-tiles-section">
            <ul className="stores-tiles">
              {stores.map((store) => (
                <li key={store.id}>
                  <a className="store-tile" href={storePublicUrl(store.slug)}>
                    <span aria-hidden="true" className="store-tile-logo">
                      {/* Logo déjà optimisé (WebP carré) : affiché tel quel. */}
                      {store.logoUrl ? <img alt="" height={72} loading="lazy" src={store.logoUrl} width={72} /> : initials(store.name) || <Store size={26} />}
                    </span>
                    <strong>{store.name}</strong>
                    <small>
                      <MapPin aria-hidden="true" size={13} /> {[store.city, countryName(store.country)].filter(Boolean).join(", ")}
                    </small>
                    {store.activity && <span className="store-tile-activity">{store.activity}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="search-empty">
            <h3>Les premières boutiques arrivent</h3>
            <p>Vous êtes vendeur ? Votre boutique pourrait être la première affichée ici.</p>
            <LandingButton href="/inscription">Créer ma boutique gratuitement</LandingButton>
          </div>
        )}
      </div>
    </PageShell>
  );
}
