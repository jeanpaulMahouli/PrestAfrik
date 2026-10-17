import { notFound } from "next/navigation";
import { StoreCartPage } from "@/components/storefront/store-cart-page";
import { getStorefrontStore } from "@/modules/catalog/service";

export const metadata = { title: "Mon panier", robots: { index: false } };

export default async function StoreCartRoute({ params }: PageProps<"/[slug]/panier">) {
  const { slug } = await params;
  const store = await getStorefrontStore(slug);
  if (!store || store.isPreview) notFound();
  return <StoreCartPage key={store.slug} storeSlug={store.slug} />;
}
