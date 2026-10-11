import { ProductForm } from "@/components/catalog/product-form";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireStorePermission } from "@/modules/stores/context";
import { prisma } from "@/lib/prisma";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; raison?: string }>;
}) {
  const { session, store, memberships, membership } = await requireStorePermission("products.manage");
  const { erreur, raison } = await searchParams;
  const categories = await prisma.productCategory.findMany({
    where: { storeId: store.id },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <DashboardShell memberships={memberships} role={membership.role} store={store} userEmail={session.user.email} userName={session.user.name}>
      {erreur === "abonnement" ? (
        <p aria-live="polite" className="form-error notice-error" role="alert">
          {raison ?? "Le quota de produits de ton offre est atteint."}{" "}
          <Link className="text-link" href="/dashboard/abonnement">Voir les offres</Link>
        </p>
      ) : erreur ? (
        <p aria-live="polite" className="form-error" role="alert">{erreur}</p>
      ) : null}
      <ProductForm categories={categories} />
    </DashboardShell>
  );
}
import Link from "next/link";
