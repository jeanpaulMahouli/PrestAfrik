import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BannerCarousel } from "@/components/storefront/banner-carousel";
import { Suspense } from "react";
import { CatalogToolbar } from "@/components/storefront/catalog-toolbar";
import { PromoHeading } from "@/components/storefront/promo-heading";
import { PromoRail } from "@/components/storefront/promo-rail";
import { StorePagination } from "@/components/storefront/store-pagination";
import { ProductCard, StorefrontProductGrid } from "@/components/storefront/storefront-product-grid";
import { discountPercent } from "@/modules/catalog/format";
import { getPublishedProducts, getStorefrontStore } from "@/modules/catalog/service";
import { storeLinkHref } from "@/modules/merchandising/links";
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
      locale: "fr_CM",
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
  const [products, ratings, merchandising] = await Promise.all([
    getPublishedProducts(store.id, { category, query: search }),
    store.reviewsEnabled ? getRatingSummaries(store.id) : null,
    getStorefrontMerchandising(store.id),
  ]);
  const base = await storeBasePath(store.slug);
  const home = storeHref(base);
  // Tri choisi dans la barre du catalogue (maquette « Products Page »).
  const sort = typeof query.tri === "string" ? query.tri : "";
  const currentPrice = (product: { priceXaf: number; promotionalPriceXaf: number | null }) => product.promotionalPriceXaf ?? product.priceXaf;
  const sorted =
    sort === "prix-croissant" ? [...products].sort((a, b) => currentPrice(a) - currentPrice(b))
    : sort === "prix-decroissant" ? [...products].sort((a, b) => currentPrice(b) - currentPrice(a))
    : sort === "promotions" ? [...products].sort((a, b) => discountPercent(b) - discountPercent(a))
    : products;
  const listing = filtering || sort !== "";

  // Sections de l'accueil, masquées pendant une recherche ou dans une catégorie.
  const slides = merchandising.banners.map((banner) => ({ id: banner.id, imageUrl: banner.imageUrl, altText: banner.altText, href: storeLinkHref(banner, base) }));
  const promotions = merchandising.promotions;
  const topRated = store.reviewsEnabled ? merchandising.topRated : [];
  // Photos chargées en priorité (LCP mobile) : celles de la première grille visible, sous la bannière et
  // la rangée Promotions quand elles existent (elles ont alors leurs propres photos prioritaires).
  const firstGrid = filtering || slides.length === 0 ? 4 : 0;
  // Onglets de l'accueil (maquette) : tous les produits, mis en avant, les mieux notés.
  const tabs = [
    { key: "tous", label: "Tous les produits" },
    ...(merchandising.featured.length > 0 ? [{ key: "vedette", label: "Mis en avant" }] : []),
    ...(topRated.length > 0 ? [{ key: "notes", label: "Les mieux notés" }] : []),
  ];
  const view = tabs.find((tab) => tab.key === query.vue)?.key ?? "tous";
  const tabHref = (key: string) => (key === "tous" ? `${home}#produits` : `${home}?vue=${key}#produits`);
  const featuredPage = readPage(query.featured, merchandising.featured.length);
  const topPage = readPage(query.top, topRated.length);
  const pagesOf = (total: number) => Math.ceil(total / homeSectionPageSize);
  const sectionHref = (key: "featured" | "top") => (page: number) => {
    const next = new URLSearchParams();
    if (view !== "tous") next.set("vue", view);
    const pagesBy = { featured: featuredPage, top: topPage, [key]: page };
    if (pagesBy.featured > 1) next.set("featured", String(pagesBy.featured));
    if (pagesBy.top > 1) next.set("top", String(pagesBy.top));
    const text = next.toString();
    return `${text ? `${home}?${text}` : home}#produits`;
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

      {/* Bannière du vendeur (Marketing → Bannière) : image pleine largeur, rien quand elle n'est pas active. */}
      {!filtering && slides.length > 0 && <BannerCarousel slides={slides} />}

      {!listing && promotions.length > 0 && (
        <section aria-labelledby="sf-promo-title" className="sf-home-section sf-promo-section">
          <PromoHeading
            action={<Link className="sf-promo-all" href={storeHref(base, "promotions")}>Tout voir</Link>}
            count={promotions.length}
            id="sf-promo-title"
            maxDiscount={discountPercent(promotions[0])}
          />
          <PromoRail label="Promotions">
            {promotions.slice(0, promoRowSize).map((product) => (
              <ProductCard base={base} className="sf-card sf-rail-card" discountBadge key={product.id} product={product} promo ratings={ratings} />
            ))}
            {promotions.length > promoRowSize && (
              <li className="sf-rail-card sf-rail-more">
                <Link href={storeHref(base, "promotions")}>Voir toutes les promotions</Link>
              </li>
            )}
          </PromoRail>
        </section>
      )}

      <div className="sf-catalog-head" id="produits">
        <Suspense fallback={null}>
          <CatalogToolbar categories={store.categories.map((item) => ({ slug: item.slug, name: item.name }))} />
        </Suspense>
      </div>

      {listing ? (
        products.length ? (
          <section aria-labelledby="sf-all-title" className="sf-home-section">
            <header className="sf-home-section-head">
              <h2 id="sf-all-title">{search ? `Résultats pour « ${search} »` : category ? (store.categories.find((item) => item.slug === category)?.name ?? "Catégorie") : "Tous les produits"}</h2>
            </header>
            <StorefrontProductGrid base={base} eager={firstGrid} products={sorted} ratings={ratings} />
          </section>
        ) : (
          <section className="sf-empty">
            <h2>Aucun produit trouvé</h2>
            <p>{search ? "Essayez un autre mot." : "Essayez une autre catégorie."}</p>
            <Link className="sf-btn sf-btn-secondary" href={home}>Voir tous les produits</Link>
          </section>
        )
      ) : products.length ? (
        <section aria-labelledby="sf-tabs-title" className="sf-home-section sf-tabs-section">
          <h2 className="visually-hidden" id="sf-tabs-title">Nos produits</h2>
          {tabs.length > 1 ? (
            <nav aria-label="Choisir une sélection" className="sf-tabs">
              {tabs.map((tab) => (
                <Link aria-current={tab.key === view ? "page" : undefined} href={tabHref(tab.key)} key={tab.key} scroll={false}>
                  {tab.label}
                </Link>
              ))}
            </nav>
          ) : (
            <p aria-hidden="true" className="sf-tabs">
              <span aria-current="page">Tous les produits</span>
            </p>
          )}
          {view === "vedette" ? (
            <>
              <StorefrontProductGrid base={base} eager={firstGrid} products={pageSlice(merchandising.featured, featuredPage)} ratings={ratings} />
              <StorePagination href={sectionHref("featured")} label="Mis en avant" page={featuredPage} pages={pagesOf(merchandising.featured.length)} />
            </>
          ) : view === "notes" ? (
            <>
              <StorefrontProductGrid base={base} eager={firstGrid} products={pageSlice(topRated, topPage)} ratings={ratings} />
              <StorePagination href={sectionHref("top")} label="Les mieux notés" page={topPage} pages={pagesOf(topRated.length)} />
            </>
          ) : (
            <StorefrontProductGrid base={base} eager={firstGrid} products={products} ratings={ratings} />
          )}
        </section>
      ) : (
        <section className="sf-empty">
          <h2>La boutique prépare son catalogue</h2>
          <p>Les produits apparaîtront ici très bientôt.</p>
        </section>
      )}
    </main>
  );
}
