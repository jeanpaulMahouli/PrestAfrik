import { VendorShell } from "@/components/layout/vendor-shell";
import { ImportWizard } from "@/components/catalog/import-wizard";
import { requireStorePermission } from "@/modules/stores/context";

export const metadata = { title: "Importer des produits" };

export default async function ImportProductsPage() {
  await requireStorePermission("products.manage");
  return (
    <VendorShell>
      <ImportWizard />
    </VendorShell>
  );
}
