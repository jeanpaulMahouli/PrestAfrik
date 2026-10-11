import { StoreCartPage } from "@/components/storefront/store-cart-page";
import { getPublishedStore } from "@/modules/catalog/service";
import { notFound } from "next/navigation";

export default async function StoreCartRoute({
  params,
}: PageProps<"/boutique/[slug]/panier">) {
  const { slug } = await params;
  const store = await getPublishedStore(slug);
  if (!store) notFound();
  return (
    <main className="storefront-content">
      <StoreCartPage key={store.slug} storeCity={store.city ?? ""} storeSlug={store.slug} />
    </main>
  );
}
