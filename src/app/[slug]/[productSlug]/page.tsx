import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { absoluteUrl, jsonLd } from "@/lib/seo";
import { storeBasePath } from "@/lib/store-links";
import { storePublicUrl } from "@/lib/urls";
import { ProductDetail } from "@/components/storefront/product-detail";
import { ProductReviews } from "@/components/storefront/product-reviews";
import { StorefrontProductGrid } from "@/components/storefront/storefront-product-grid";
import { richTextToPlain } from "@/modules/catalog/rich-text";
import { formatXaf, getPublishedProduct, getStorefrontStore } from "@/modules/catalog/service";
import { getProductReviews, getRatingSummaries, getSimilarProducts } from "@/modules/reviews/queries";
import { getStorefrontWhatsapp } from "@/modules/whatsapp/settings";

export async function generateMetadata({ params }: PageProps<"/[slug]/[productSlug]">): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const store = await getStorefrontStore(slug);
  const product = store ? await getPublishedProduct(store.id, productSlug) : null;
  if (!store || !product) return { title: "Produit introuvable" };
  const url = `${storePublicUrl(store.slug)}/${product.slug}`;
  const description = productSummary(product, store.name);
  return {
    title: `${product.name} · ${store.name}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: store.name,
      locale: "fr_FR",
      url,
      title: `${product.name} — ${formatXaf(currentPrice(product))}`,
      description,
      ...(product.images.length ? { images: product.images.map((image) => ({ url: absoluteUrl(image.url), alt: image.altText ?? product.name })) } : {}),
    },
    ...(store.isPreview ? { robots: { index: false, follow: false } } : {}),
  };
}

type SeoProduct = { name: string; description: string | null; priceXaf: number; promotionalPriceXaf: number | null };

const currentPrice = (product: SeoProduct) => product.promotionalPriceXaf ?? product.priceXaf;

function productSummary(product: SeoProduct, storeName: string) {
  const text = product.description ? richTextToPlain(product.description).replace(/\s+/g, " ").trim() : "";
  return text ? text.slice(0, 160) : `${product.name} à ${formatXaf(currentPrice(product))} chez ${storeName}. Commandez en ligne, paiement à la livraison.`;
}

export default async function PublicProductPage({
  params,
}: PageProps<"/[slug]/[productSlug]">) {
  const { slug, productSlug } = await params;
  const store = await getStorefrontStore(slug);
  const product = store ? await getPublishedProduct(store.id, productSlug) : null;
  if (!store || !product) notFound();
  const reviewsEnabled = store.reviewsEnabled;
  const [whatsapp, reviews, similar, ratings] = await Promise.all([
    getStorefrontWhatsapp(store.id),
    reviewsEnabled ? getProductReviews(store.id, product.id) : null,
    getSimilarProducts(store.id, product.id, product.categoryId),
    reviewsEnabled ? getRatingSummaries(store.id) : null,
  ]);
  // Adresse publique partagée (sous-domaine de la boutique quand il est activé).
  const productUrl = `${storePublicUrl(store.slug)}/${product.slug}`;
  const base = await storeBasePath(store.slug);
  // Fiche « produit » lue par Google : prix, disponibilité et note peuvent s'afficher dans les résultats.
  const rating = reviews?.summary;
  const structuredData = {
    "@type": "Product",
    name: product.name,
    url: productUrl,
    description: productSummary(product, store.name),
    ...(product.images.length ? { image: product.images.map((image) => absoluteUrl(image.url)) } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    brand: { "@type": "Brand", name: store.name },
    offers: {
      "@type": "Offer",
      url: productUrl,
      price: currentPrice(product),
      priceCurrency: "XAF",
      availability: product.availability === "PREORDER" ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: store.name, url: storePublicUrl(store.slug) },
    },
    ...(rating && rating.count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.average, reviewCount: rating.count, bestRating: 5, worstRating: 1 } }
      : {}),
  };

  return (
    <>
      {!store.isPreview && <script dangerouslySetInnerHTML={jsonLd(structuredData)} type="application/ld+json" />}
      <ProductDetail
        canOrder={!store.isPreview && !store.subscriptionPaused}
        product={product}
        productUrl={productUrl}
        rating={reviews?.summary ?? null}
        storeName={store.name}
        storeSlug={store.slug}
        whatsappNumber={whatsapp.productOrderButtonEnabled ? whatsapp.number : null}
      >
        {reviews && <ProductReviews productId={product.id} reviews={reviews.reviews} summary={reviews.summary} />}
        {similar.length > 0 && (
          <section aria-labelledby="sf-similar-title" className="sf-section sf-similar">
            <div className="sf-section-head">
              <h2 id="sf-similar-title">Produits similaires</h2>
            </div>
            <StorefrontProductGrid products={similar} ratings={ratings} base={base} />
          </section>
        )}
      </ProductDetail>
    </>
  );
}
