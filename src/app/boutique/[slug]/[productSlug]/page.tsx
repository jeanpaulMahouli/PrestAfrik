import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/storefront/product-detail";
import { getPublishedProduct, getStorefrontStore } from "@/modules/catalog/service";

export async function generateMetadata({ params }: PageProps<"/boutique/[slug]/[productSlug]">) {
  const { slug, productSlug } = await params;
  const store = await getStorefrontStore(slug);
  const product = store ? await getPublishedProduct(store.id, productSlug) : null;
  return {
    title: product ? `${product.name} · ${store?.name}` : "Produit introuvable",
    description: product?.description ?? "Découvre ce produit et commande auprès de cette boutique.",
    ...(store?.isPreview ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function PublicProductPage({
  params,
}: PageProps<"/boutique/[slug]/[productSlug]">) {
  const { slug, productSlug } = await params;
  const store = await getStorefrontStore(slug);
  const product = store ? await getPublishedProduct(store.id, productSlug) : null;
  if (!store || !product) notFound();

  return <ProductDetail canOrder={!store.isPreview} product={product} storeSlug={store.slug} />;
}
