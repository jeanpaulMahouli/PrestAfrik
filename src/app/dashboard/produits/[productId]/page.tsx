import { notFound } from "next/navigation";
import { ProductForm } from "@/components/catalog/product-form";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireStorePermission } from "@/modules/stores/context";
import { prisma } from "@/lib/prisma";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { session, store, memberships, membership } = await requireStorePermission("products.manage");
  const [{ productId }, { erreur }] = await Promise.all([params, searchParams]);
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id, isArchived: false },
    include: {
      variants: { where: { isArchived: false }, orderBy: { optionValue: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) notFound();
  const categories = await prisma.productCategory.findMany({
    where: { storeId: store.id },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <DashboardShell memberships={memberships} role={membership.role} store={store} userEmail={session.user.email} userName={session.user.name}>
      {erreur && <p aria-live="polite" className="form-error" role="alert">{erreur}</p>}
      <ProductForm categories={categories} product={product} />
    </DashboardShell>
  );
}
