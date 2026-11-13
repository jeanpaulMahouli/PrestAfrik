import { productAiAvailable } from "@/lib/product-ai";
import { getAiCredits } from "@/modules/ai-credits/server";
import { notFound } from "next/navigation";
import { VendorShell } from "@/components/layout/vendor-shell";
import { ProductDangerZone } from "@/components/catalog/product-danger-zone";
import { ProductForm } from "@/components/catalog/product-form";
import { photoVariant } from "@/lib/product-photos";
import { archiveProducts, deleteProducts } from "@/modules/catalog/actions";
import { getEditableProduct, getStoreCategories } from "@/modules/catalog/queries";
import { storedPropertyDetails } from "@/modules/catalog/listing";
import { requireStorePermission } from "@/modules/stores/context";
import { storeCatalogProfile } from "@/modules/stores/universe";

export const metadata = { title: "Modifier un produit" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/dashboard/produits/[productId]">) {
  const { store } = await requireStorePermission("products.manage");
  const [{ productId }, query] = await Promise.all([params, searchParams]);
  const [product, categories, profile, credits] = await Promise.all([getEditableProduct(store.id, productId), getStoreCategories(store.id), storeCatalogProfile(store.activityId), productAiAvailable() ? getAiCredits(store.id) : null]);
  if (!product) notFound();
  const aiCredits = credits ? { total: credits.total, monthly: credits.monthly, bonus: credits.bonus, allowance: credits.allowance, renewsAt: credits.renewsAt.toISOString() } : null;

  return (
    <VendorShell>
      {query.succes === "copie" && (
        <p className="v-banner v-banner-success" role="status">
          Copie créée en brouillon, sans photos ni stock. Complétez-la puis passez-la en « Actif ».
        </p>
      )}
      <ProductForm
        aiCredits={aiCredits}
        aiEnabled={productAiAvailable()}
        categories={categories}
        listingMode={profile.listingMode}
        universe={profile.universe}
        sidePanel={
          <ProductDangerZone
            archive={archiveProducts}
            archived={product.status === "ARCHIVED"}
            name={product.name}
            orderCount={product._count.orderItems}
            productId={product.id}
            remove={deleteProducts}
          />
        }
        values={{
          id: product.id,
          updatedAt: product.updatedAt.toISOString(),
          name: product.name,
          description: product.description ?? "",
          categoryId: product.categoryId ?? "",
          priceXaf: String(product.priceXaf),
          promotionalPriceXaf: product.promotionalPriceXaf === null ? "" : String(product.promotionalPriceXaf),
          sku: product.sku,
          availability: product.availability,
          trackInventory: product.trackInventory,
          stockQuantity: product.stockQuantity === null ? "" : String(product.stockQuantity),
          status: product.status,
          isFeatured: product.isFeatured,
          photos: product.images.map((image) => ({ id: image.id, previewUrl: photoVariant(image.url, 320), alt: image.altText ?? "" })),
          optionName: product.variants[0]?.optionName ?? "",
          variants: product.variants.map((variant) => ({
            optionValue: variant.optionValue,
            sku: variant.sku,
            priceXaf: variant.priceXaf === null ? "" : String(variant.priceXaf),
            stockQuantity: variant.stockQuantity === null ? "" : String(variant.stockQuantity),
          })),
          listing: {
            listingType: product.listingType ?? "",
            pricePeriod: product.pricePeriod ?? "",
            details: storedPropertyDetails(product.propertyDetails),
          },
        }}
      />
    </VendorShell>
  );
}
