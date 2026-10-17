import { notFound } from "next/navigation";
import { StoreCheckout } from "@/components/storefront/store-checkout";
import { getStorefrontStore } from "@/modules/catalog/service";
import { getStorefrontExtras } from "@/modules/storefront/data";

export const metadata = { title: "Finaliser ma commande", robots: { index: false } };

export default async function CheckoutRoute({ params }: PageProps<"/[slug]/commande">) {
  const { slug } = await params;
  const store = await getStorefrontStore(slug);
  if (!store || store.isPreview || store.subscriptionPaused) notFound();
  const extras = await getStorefrontExtras(store.id);
  return (
    <StoreCheckout
      key={store.slug}
      pickup={{ enabled: extras.store.pickupEnabled, address: extras.store.pickupAddress ?? extras.store.address, hours: extras.store.pickupHours }}
      storeSlug={store.slug}
      whatsappOrderEnabled={extras.whatsappOrderEnabled}
      zones={extras.zones}
    />
  );
}
