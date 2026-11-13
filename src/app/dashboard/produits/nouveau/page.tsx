import { productAiAvailable } from "@/lib/product-ai";
import { VendorShell } from "@/components/layout/vendor-shell";
import { ProductForm } from "@/components/catalog/product-form";
import { getStoreCategories } from "@/modules/catalog/queries";
import { requireStorePermission } from "@/modules/stores/context";
import { storeCatalogProfile } from "@/modules/stores/universe";

export const metadata = { title: "Ajouter un produit" };

export default async function NewProductPage() {
  const { store } = await requireStorePermission("products.manage");
  const [categories, profile] = await Promise.all([getStoreCategories(store.id), storeCatalogProfile(store.activityId)]);

  return (
    <VendorShell>
      <ProductForm
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
