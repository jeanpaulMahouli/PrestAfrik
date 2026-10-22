import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/storefront/product-detail";
import { ProductReviews } from "@/components/storefront/product-reviews";
import { StorefrontProductGrid } from "@/components/storefront/storefront-product-grid";
import { richTextToPlain } from "@/modules/catalog/rich-text";
import { getPublishedProduct, getStorefrontStore } from "@/modules/catalog/service";
import { getProductReviews, getRatingSummaries, getSimilarProducts } from "@/modules/reviews/queries";
import { getStorefrontWhatsapp } from "@/modules/whatsapp/settings";

export async function generateMetadata({ params }: PageProps<"/[slug]/[productSlug]">) {
  const { slug, productSlug } = await params;
  const store = await getStorefrontStore(slug);
  const product = store ? await getPublishedProduct(store.id, productSlug) : null;
  return {
    title: product ? `${product.name} · ${store?.name}` : "Produit introuvable",
    description: product?.description ? richTextToPlain(product.description).slice(0, 160) : "Découvrez ce produit et commandez auprès de cette boutique.",
    ...(store?.isPreview ? { robots: { index: false, follow: false } } : {}),
  };
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
  const productUrl = new URL(
    `/${store.slug}/${product.slug}`,
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  ).toString();

  return (
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
          <StorefrontProductGrid products={similar} ratings={ratings} storeSlug={store.slug} />
        </section>
      )}
    </ProductDetail>
  );
}
