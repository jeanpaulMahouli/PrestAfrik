import "@/styles/storefront.css";
import "@/styles/storefront-merchandising.css";
import "@/styles/storefront-motion.css";
import "@/styles/storefront-promo.css";
import "@/styles/storefront-pages.css";
import "@/styles/storefront-v2.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopProductCard } from "@/components/shop/product-card";
import { categoryHref, ShopShell } from "@/components/shop/shop-shell";
import { ShowcaseHead } from "@/components/shop/shop-showcase";
import { ProductDetail } from "@/components/storefront/product-detail";
import { ProductReviews } from "@/components/storefront/product-reviews";
import { StoreCartProvider } from "@/components/storefront/store-cart-provider";
import { absoluteUrl, jsonLd } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { shopUrl, storePublicUrl } from "@/lib/urls";
import { getShopTicker, getShopTickerSeconds } from "@/modules/announcements/queries";
import { formatXaf } from "@/modules/catalog/format";
import { richTextToPlain } from "@/modules/catalog/rich-text";
import { getPublishedProduct, getStorefrontStore } from "@/modules/catalog/service";
import { getShopScope } from "@/modules/marketplace/country";
import { countryName } from "@/modules/marketplace/search";
import { getProductNeighbours, hasMarketplacePrice, marketplaceProductPath, marketplaceStore } from "@/modules/marketplace/shop";
import { getProductReviews } from "@/modules/reviews/queries";
import { getStorefrontWhatsapp } from "@/modules/whatsapp/settings";

export const dynamic = "force-dynamic";

type Params = PageProps<"/nos-boutiques/produit/[boutique]/[produit]">["params"];

/** Produit d'une boutique visible sur la marketplace (publiée, non suspendue), ou null. */
async function load(params: Params) {
  const { boutique, produit } = await params;
  const listed = await marketplaceStore(boutique);
  if (!listed) return null;
  const store = await getStorefrontStore(boutique);
  if (!store || store.isPreview) return null;
  const product = await getPublishedProduct(store.id, produit);
  if (!product || !hasMarketplacePrice(product)) return null;
  // Produit à 0 FCFA ou sous 50 FCFA, ou masqué par l'administration : absent de la marketplace (sa fiche reste sur la boutique).
  const hidden = await prisma.product.findUnique({ where: { id: product.id }, select: { marketplaceHiddenAt: true } });
  return hidden?.marketplaceHiddenAt ? null : { listed, store, product };
}

const summary = (product: { name: string; description: string | null; priceXaf: number; promotionalPriceXaf: number | null }, storeName: string) => {
  const text = product.description ? richTextToPlain(product.description).replace(/\s+/g, " ").trim() : "";
  return text ? text.slice(0, 160) : `${product.name} à ${formatXaf(product.promotionalPriceXaf ?? product.priceXaf)} chez ${storeName}. Commande sur WhatsApp, paiement à la livraison.`;
};

export async function generateMetadata({ params }: PageProps<"/nos-boutiques/produit/[boutique]/[produit]">): Promise<Metadata> {
  const found = await load(params);
  if (!found) return { title: "Produit introuvable | PrestAfrik", robots: { index: false } };
  const { store, product } = found;
  const path = marketplaceProductPath(store.slug, product.slug);
  return {
    title: { absolute: `${product.name} – ${formatXaf(product.promotionalPriceXaf ?? product.priceXaf)} | ${store.name} sur PrestAfrik` },
    description: summary(product, store.name),
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "PrestAfrik",
      locale: "fr_CM",
      url: path,
      title: `${product.name} — ${formatXaf(product.promotionalPriceXaf ?? product.priceXaf)}`,
      description: summary(product, store.name),
      ...(product.images.length ? { images: product.images.map((image) => ({ url: absoluteUrl(image.url), alt: image.altText ?? product.name })) } : {}),
    },
  };
}

/**
 * Fiche produit de la marketplace : exactement la fiche des boutiques publiques (même composant, mêmes
 * styles), avec les liens de la marketplace (commande, panier), le vendeur et le partage ; puis les avis,
 * d'autres produits de la boutique et des produits similaires.
 */
export default async function MarketplaceProductPage({ params }: PageProps<"/nos-boutiques/produit/[boutique]/[produit]">) {
  const found = await load(params);
  if (!found) notFound();
  const { listed, store, product } = found;
  const scope = await getShopScope();
  const [reviews, neighbours, ticker, tickerSeconds, whatsapp] = await Promise.all([
    store.reviewsEnabled ? getProductReviews(store.id, product.id) : null,
    getProductNeighbours(listed, product.id, scope),
    getShopTicker(),
    getShopTickerSeconds(),
    getStorefrontWhatsapp(store.id),
  ]);
  const path = marketplaceProductPath(store.slug, product.slug);
  const productUrl = absoluteUrl(path);
  const storeHref = storePublicUrl(store.slug);
  const price = product.promotionalPriceXaf !== null && product.promotionalPriceXaf < product.priceXaf ? product.promotionalPriceXaf : product.priceXaf;
  const rating = reviews && reviews.summary.count > 0 ? reviews.summary : null;
  const menu = new Map(neighbours.sections.map(({ category, products }) => [category.slug, products]));
  const crumbs = [
    ...(listed.activitySlug && listed.activity ? [{ href: categoryHref(listed.activitySlug), label: listed.activity }] : []),
    { href: storeHref, label: store.name },
  ];

  const structuredData = {
    "@type": "Product",
    name: product.name,
    url: productUrl,
    description: summary(product, store.name),
    ...(product.images.length ? { image: product.images.map((image) => absoluteUrl(image.url)) } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    brand: { "@type": "Brand", name: store.name },
    offers: {
      "@type": "Offer",
      url: productUrl,
      price,
      priceCurrency: "XAF",
      availability: product.availability === "PREORDER" ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: store.name, url: storeHref },
    },
    ...(rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.average, reviewCount: rating.count, bestRating: 5, worstRating: 1 } } : {}),
  };

  return (
    <ShopShell active={listed.activitySlug ?? undefined} categories={neighbours.categories} local={false} menu={menu} scope={scope} ticker={ticker} tickerSeconds={tickerSeconds}>
      <script dangerouslySetInnerHTML={jsonLd(structuredData)} type="application/ld+json" />
      <div className={`sf sf-v2 sf-promo-${store.promoStyle.toLowerCase().replaceAll("_", "-")} sx-sf`}>
        <StoreCartProvider storeId={store.id}>
          <ProductDetail
            canOrder={!store.subscriptionPaused}
            marketplace={{
              homeHref: shopUrl("/"),
              checkoutHref: shopUrl(`/commande?boutique=${encodeURIComponent(store.slug)}`),
              crumbs,
              cartStore: { id: store.id, slug: store.slug, name: store.name, logoUrl: listed.logoUrl },
              seller: { name: store.name, href: storeHref, logoUrl: listed.logoUrl, place: [listed.city, countryName(listed.country)].filter(Boolean).join(", ") },
            }}
            product={product}
            productUrl={productUrl}
            rating={rating}
            storeName={store.name}
            storeSlug={store.slug}
            whatsappNumber={whatsapp.productOrderButtonEnabled ? whatsapp.number : null}
          >
            {reviews && <ProductReviews productId={product.id} reviews={reviews.reviews} summary={reviews.summary} />}
          </ProductDetail>
        </StoreCartProvider>
      </div>

      <div className="sx-wrap sx-stack">
        {neighbours.sameStore.length > 0 && (
          <section aria-labelledby="meme-boutique-title" className="shop-section sx-section">
            <ShowcaseHead href={storeHref} id="meme-boutique-title" more="Voir la boutique" title={`Chez ${store.name}`} />
            <ul className="sx-more-grid">
              {neighbours.sameStore.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <ShopProductCard product={item} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {neighbours.similar.length > 0 && (
          <section aria-labelledby="similaires-title" className="shop-section sx-section">
            <ShowcaseHead href={listed.activitySlug ? categoryHref(listed.activitySlug) : shopUrl("/recherche")} id="similaires-title" more="Tout voir" title="Produits similaires" />
            <ul className="sx-more-grid">
              {neighbours.similar.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <ShopProductCard product={item} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </ShopShell>
  );
}
