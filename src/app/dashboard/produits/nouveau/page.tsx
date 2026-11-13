import { productAiAvailable } from "@/lib/product-ai";
import { getAiCredits } from "@/modules/ai-credits/server";
import { VendorShell } from "@/components/layout/vendor-shell";
import { ProductForm } from "@/components/catalog/product-form";
import { getStoreCategories } from "@/modules/catalog/queries";
import { requireStorePermission } from "@/modules/stores/context";
import { storeCatalogProfile } from "@/modules/stores/universe";

export const metadata = { title: "Ajouter un produit" };

export default async function NewProductPage() {
  const { store } = await requireStorePermission("products.manage");
  const [categories, profile, credits] = await Promise.all([getStoreCategories(store.id), storeCatalogProfile(store.activityId), productAiAvailable() ? getAiCredits(store.id) : null]);

  const aiCredits = credits ? { total: credits.total, monthly: credits.monthly, bonus: credits.bonus, allowance: credits.allowance, renewsAt: credits.renewsAt.toISOString() } : null;

  return (
    <VendorShell>
      <ProductForm
        aiCredits={aiCredits}
        aiEnabled={productAiAvailable()}
        categories={categories}
        listingMode={profile.listingMode}
        universe={profile.universe}
        values={{
          name: "",
          description: "",
          categoryId: "",
          priceXaf: "",
          promotionalPriceXaf: "",
          sku: "",
          availability: "AVAILABLE",
          trackInventory: false,
          stockQuantity: "",
          status: "ACTIVE",
          isFeatured: false,
          photos: [],
          optionName: "",
          variants: [],
        }}
      />
    </VendorShell>
  );
}
