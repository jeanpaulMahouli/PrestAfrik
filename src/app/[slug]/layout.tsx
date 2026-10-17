import { notFound } from "next/navigation";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { getStorefrontStore } from "@/modules/catalog/service";
import { hexColorSchema } from "@/modules/catalog/validation";
import { getAccessibleTextColor } from "@/modules/stores/appearance";
import { getStorefrontExtras } from "@/modules/storefront/data";

function safeColor(value: string, fallback: string) {
  const parsed = hexColorSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

export default async function PublicStoreLayout({ children, params }: LayoutProps<"/[slug]">) {
  const { slug } = await params;
  const store = await getStorefrontStore(slug);
  if (!store) notFound();
  const extras = await getStorefrontExtras(store.id);
  const primary = safeColor(store.primaryColor, "#FF9900");
  const secondary = safeColor(store.secondaryColor, "#000026");

  return (
    <StorefrontShell
      chat={
        extras.chat && extras.whatsappNumber
          ? { ...extras.chat, whatsappNumber: extras.whatsappNumber }
          : null
      }
      isPaused={store.subscriptionPaused}
      isPreview={store.isPreview}
      pages={extras.pages}
      store={{
        id: store.id,
        name: store.name,
        slug: store.slug,
        city: store.city,
        logoUrl: store.logoUrl,
        theme: store.theme,
        colors: {
          primary,
          onPrimary: getAccessibleTextColor(primary),
          secondary,
          onSecondary: getAccessibleTextColor(secondary),
          accent: safeColor(store.accentColor, "#EF765E"),
        },
      }}
    >
      {children}
    </StorefrontShell>
  );
}
