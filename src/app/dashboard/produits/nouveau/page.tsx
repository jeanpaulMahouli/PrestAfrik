import { VendorShell } from "@/components/layout/vendor-shell";
import { ProductForm } from "@/components/catalog/product-form";
import { getStoreCategories } from "@/modules/catalog/queries";
import { requireStorePermission } from "@/modules/stores/context";

export const metadata = { title: "Ajouter un produit" };

export default async function NewProductPage() {
  const { store } = await requireStorePermission("products.manage");
  const categories = await getStoreCategories(store.id);

  return (
    <VendorShell>
      <ProductForm
        categories={categories}
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
