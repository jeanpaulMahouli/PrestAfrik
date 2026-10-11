import { notFound } from "next/navigation";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { getAccessibleTextColor } from "@/modules/stores/appearance";
import { getStorefrontStore } from "@/modules/catalog/service";
import { hexColorSchema } from "@/modules/catalog/validation";

function safeColor(value: string, fallback: string) {
  const parsed = hexColorSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

export default async function PublicStoreLayout({
  children,
  params,
}: LayoutProps<"/boutique/[slug]">) {
  const { slug } = await params;
  const store = await getStorefrontStore(slug);
  if (!store) notFound();

  return (
    <StorefrontShell
      storeCity={store.city}
      storeId={store.id}
      storeName={store.name}
      storeLogoUrl={store.logoUrl}
      storeSlug={store.slug}
      storeTheme={store.theme}
      primaryColor={safeColor(store.primaryColor, "#FF9900")}
      secondaryColor={safeColor(store.secondaryColor, "#000026")}
      accentColor={safeColor(store.accentColor, "#EF765E")}
      primaryTextColor={getAccessibleTextColor(safeColor(store.primaryColor, "#FF9900"))}
      secondaryTextColor={getAccessibleTextColor(safeColor(store.secondaryColor, "#000026"))}
      isPreview={store.isPreview}
      isPaused={store.subscriptionPaused}
    >
      {children}
    </StorefrontShell>
  );
}
