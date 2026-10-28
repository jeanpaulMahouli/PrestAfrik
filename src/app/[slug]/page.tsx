import { Banknote, MapPin, PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BannerCarousel } from "@/components/storefront/banner-carousel";
import { PromoHeading } from "@/components/storefront/promo-heading";
import { PromoRail } from "@/components/storefront/promo-rail";
import { StorePagination } from "@/components/storefront/store-pagination";
import { ProductCard, StorefrontProductGrid } from "@/components/storefront/storefront-product-grid";
import { discountPercent } from "@/modules/catalog/format";
import { formatXaf, getPublishedProducts, getStorefrontStore } from "@/modules/catalog/service";
import { storeLinkHref } from "@/modules/merchandising/links";
import { deliverySummary, getStorefrontExtras } from "@/modules/storefront/data";
import { getStorefrontMerchandising, homeSectionPageSize, pageSlice, promoRowSize, readPage } from "@/modules/storefront/merchandising";
import { getRatingSummaries } from "@/modules/reviews/queries";
import { storeHref } from "@/lib/store-host";
import { storeBasePath } from "@/lib/store-links";
import { absoluteUrl, jsonLd } from "@/lib/seo";
import { storePublicUrl } from "@/lib/urls";

/** Résumé de la boutique pour Google et les aperçus de liens : sa description, sinon une phrase avec sa ville. */
function storeSummary(store: { name: string; city: string | null; description: string | null }) {
  if (store.description?.trim()) return store.description.trim().slice(0, 300);
  return `${store.name}, boutique en ligne${store.city ? ` à ${store.city}` : ""} sur PrestAfrik : découvrez nos produits et commandez en quelques secondes, paiement à la livraison.`;
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStorefrontStore(slug);
  if (!store) return { title: "Boutique bientôt en ligne" };
  const url = storePublicUrl(store.slug);
  const image = store.bannerUrl ?? store.logoUrl;
  return {
    title: `${store.name}${store.city ? ` — Boutique en ligne à ${store.city}` : " — Boutique en ligne"}`,
    description: storeSummary(store),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: store.name,
      locale: "fr_FR",
      url,
      title: store.name,
      ...(image ? { images: [{ url: absoluteUrl(image), alt: store.name }] } : {}),
    },
    ...(store.isPreview ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function PublicStorePage({ params, searchParams }: PageProps<"/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const store = await getStorefrontStore(slug);
  if (!store) notFound();

  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const category = typeof query.categorie === "string" ? query.categorie.slice(0, 90) : undefined;
  const filtering = Boolean(search || category);
  const [products, extras, ratings, merchandising] = await Promise.all([
    getPublishedProducts(store.id, { category, query: search }),
    getStorefrontExtras(store.id),
    store.reviewsEnabled ? getRatingSummaries(store.id) : null,
    getStorefrontMerchandising(store.id),
  ]);
  const base = await storeBasePath(store.slug);
  const home = storeHref(base);

  // Sections de l'accueil, masquées pendant une recherche ou dans une catégorie.
  const slides = merchandising.banners.map((banner) => ({ id: banner.id, imageUrl: banner.imageUrl, altText: banner.altText, href: storeLinkHref(banner, base) }));
  const promotions = merchandising.promotions;
  const topRated = store.reviewsEnabled ? merchandising.topRated : [];
  const featuredPage = readPage(query.featured, merchandising.featured.length);
  const topPage = readPage(query.top, topRated.length);
  const pagesOf = (total: number) => Math.ceil(total / homeSectionPageSize);
  const sectionHref = (key: "featured" | "top") => (page: number) => {
    const next = new URLSearchParams();
    const pagesBy = { featured: featuredPage, top: topPage, [key]: page };
    if (pagesBy.featured > 1) next.set("featured", String(pagesBy.featured));
    if (pagesBy.top > 1) next.set("top", String(pagesBy.top));
    const text = next.toString();
    return text ? `${home}?${text}` : home;
  };

  // Fiche « magasin » lue par Google : nom, adresse, logo et ville de la boutique.
  const storeUrl = storePublicUrl(store.slug);
  const storeImage = store.bannerUrl ?? store.logoUrl;
  const structuredData = {
    "@type": "Store",
    "@id": `${storeUrl}#boutique`,
    name: store.name,
    url: storeUrl,
    description: storeSummary(store),
    ...(store.logoUrl ? { logo: absoluteUrl(store.logoUrl) } : {}),
    ...(storeImage ? { image: absoluteUrl(storeImage) } : {}),
    ...(store.city ? { address: { "@type": "PostalAddress", addressLocality: store.city } } : {}),
    currenciesAccepted: "XAF",
    paymentAccepted: "Paiement à la livraison",
  };

  return (
    <main className="sf-home">
      {!store.isPreview && <script dangerouslySetInnerHTML={jsonLd(structuredData)} type="application/ld+json" />}
      <h1 className="visually-hidden" data-store-name="">{store.name}</h1>
      {store.description && <p className="sf-description sf-home-description">{store.description}</p>}

      <form action={home} className="sf-search" role="search">
        <label className="visually-hidden" htmlFor="sf-search">Rechercher un produit</label>
        <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="18"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input defaultValue={search} id="sf-search" maxLength={100} name="q" placeholder="Rechercher un produit" type="search" />
        {category && <input name="categorie" type="hidden" value={category} />}
      </form>

      {!filtering && <BannerCarousel slides={slides} />}

      {store.categories.length > 0 && (
        <nav aria-label="Catégories" className="sf-chips">
          <Link aria-current={category ? undefined : "page"} href={home}>Tout</Link>
          {store.categories.map((item) => (
            <Link aria-current={category === item.slug ? "page" : undefined} href={`${home}?categorie=${encodeURIComponent(item.slug)}`} key={item.id}>
              {item.name}
            </Link>
          ))}
        </nav>
      )}

      {/* « Grand marché » : les engagements ci-dessous disent déjà l'essentiel, sans ce bandeau. */}
      {store.theme !== "GRAND_MARCHE" && <p className="sf-info">{deliverySummary(extras, formatXaf)}</p>}

      {/* Engagements (thème « Grand marché ») : uniquement des faits vrais pour toute boutique PrestAfrik. */}
      {!filtering && (
        <ul aria-label="Nos engagements" className="sf-trust">
          <li>
            <Banknote aria-hidden="true" size={20} />
            <span><strong>Paiement à la livraison</strong><small>Vous payez à la réception</small></span>
          </li>
          <li>
            <PackageCheck aria-hidden="true" size={20} />
            <span><strong>Suivi de commande</strong><small>Un lien pour suivre votre colis</small></span>
          </li>
          {store.city && (
            <li>
              <MapPin aria-hidden="true" size={20} />
              <span><strong>Boutique à {store.city}</strong><small>Un vendeur proche de vous</small></span>
            </li>
          )}
        </ul>
      )}

      {!filtering && promotions.length > 0 && (
        <section aria-labelledby="sf-promo-title" className="sf-home-section sf-promo-section">
          <PromoHeading
            action={<Link className="sf-promo-all" href={storeHref(base, "promotions")}>Tout voir</Link>}
            count={promotions.length}
            id="sf-promo-title"
            maxDiscount={discountPercent(promotions[0])}
          />
          <PromoRail label="Promotions">
            {promotions.slice(0, promoRowSize).map((product, index) => (
              <ProductCard base={base} className="sf-card sf-rail-card" discountBadge key={product.id} priority={index < 2 && slides.length === 0} product={product} promo ratings={ratings} />
            ))}
            {promotions.length > promoRowSize && (
              <li className="sf-rail-card sf-rail-more">
                <Link href={storeHref(base, "promotions")}>Voir toutes les promotions</Link>
              </li>
            )}
          </PromoRail>
        </section>
      )}

      {!filtering && merchandising.featured.length > 0 && (
        <section aria-labelledby="sf-featured-title" className="sf-home-section">
          <header className="sf-home-section-head">
            <h2 id="sf-featured-title">Nos produits mis en avant</h2>
          </header>
          <StorefrontProductGrid base={base} eager={0} products={pageSlice(merchandising.featured, featuredPage)} ratings={ratings} />
          <StorePagination href={sectionHref("featured")} label="Nos produits mis en avant" page={featuredPage} pages={pagesOf(merchandising.featured.length)} />
        </section>
      )}

      {!filtering && topRated.length > 0 && (
        <section aria-labelledby="sf-top-title" className="sf-home-section">
          <header className="sf-home-section-head">
            <h2 id="sf-top-title">Les mieux notés</h2>
          </header>
          <StorefrontProductGrid base={base} eager={0} products={pageSlice(topRated, topPage)} ratings={ratings} />
          <StorePagination href={sectionHref("top")} label="Les mieux notés" page={topPage} pages={pagesOf(topRated.length)} />
        </section>
      )}

      {products.length ? (
        <section aria-labelledby="sf-all-title" className="sf-home-section">
          <header className="sf-home-section-head">
            <h2 id="sf-all-title">{filtering ? `${products.length} produit${products.length > 1 ? "s" : ""} trouvé${products.length > 1 ? "s" : ""}` : "Tous nos produits"}</h2>
          </header>
          <StorefrontProductGrid base={base} eager={filtering || slides.length === 0 ? 4 : 0} products={products} ratings={ratings} />
        </section>
      ) : (
        <section className="sf-empty">
          <h2>{filtering ? "Aucun produit trouvé" : "La boutique prépare son catalogue"}</h2>
          <p>{search ? "Essayez un autre mot." : category ? "Essayez une autre catégorie." : "Les produits apparaîtront ici très bientôt."}</p>
          {filtering && <Link className="sf-btn sf-btn-secondary" href={home}>Voir tous les produits</Link>}
        </section>
      )}
    </main>
  );
}
