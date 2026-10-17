import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/storefront/product-detail";
import { richTextToPlain } from "@/modules/catalog/rich-text";
import { getPublishedProduct, getStorefrontStore } from "@/modules/catalog/service";
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
  const whatsapp = await getStorefrontWhatsapp(store.id);
  const productUrl = new URL(
    `/${store.slug}/${product.slug}`,
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  ).toString();

  return (
    <ProductDetail
      canOrder={!store.isPreview && !store.subscriptionPaused}
      product={product}
      productUrl={productUrl}
      storeName={store.name}
      storeSlug={store.slug}
      whatsappNumber={whatsapp.productOrderButtonEnabled ? whatsapp.number : null}
    />
  );
}
