import Link from "next/link";
import { Prisma } from "@prisma/client";
import { ProductAvailability } from "@prisma/client";
import { ProductTable } from "@/components/catalog/product-table";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import { createCategory } from "@/modules/catalog/actions";
import { formatXaf } from "@/modules/catalog/service";
import { requireStorePermission } from "@/modules/stores/context";
import { prisma } from "@/lib/prisma";

const pageSize = 30;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categorie?: string; etat?: string; page?: string; erreur?: string; succes?: string }>;
}) {
  const { session, store, memberships, membership } = await requireStorePermission("products.read");
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 100) ?? "";
  const currentPage = Math.max(1, Math.min(1000, Number(params.page) || 1));
  const availability = Object.values(ProductAvailability).includes(params.etat as ProductAvailability)
    ? (params.etat as ProductAvailability)
    : undefined;
  const where: Prisma.ProductWhereInput = {
    storeId: store.id,
    ...(params.etat === "archived" ? { isArchived: true } : { isArchived: false }),
    ...(availability ? { availability } : {}),
    ...(params.categorie ? { categoryId: params.categorie } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [categories, products, total] = await Promise.all([
    prisma.productCategory.findMany({
      where: { storeId: store.id },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return (
    <DashboardShell
      memberships={memberships}
      role={membership.role}
      store={store}
      userEmail={session.user.email}
      userName={session.user.name}
    >
      <div className="page-heading">
        <div>
          <h1 className="dashboard-heading">Mes produits</h1>
          <p className="dashboard-copy">{total} produit{total === 1 ? "" : "s"} dans {store.name}.</p>
        </div>
        <div className="page-actions">
          <Link className="primary-button" href="/dashboard/produits/nouveau">
            Ajouter un produit
          </Link>
        </div>
      </div>

      {params.erreur && (
        <p aria-live="polite" className="form-error notice-error" role="alert">
          {params.erreur}
        </p>
      )}
      {params.succes?.startsWith("import-") && (
        <p className="notice" role="status">
          Import terminé : {params.succes.slice("import-".length)} produit(s) ajouté(s).
        </p>
      )}
      {params.succes === "produit" && <p className="notice" role="status">Produit enregistré. On avance !</p>}

      <section className="surface-card product-list-card">
        <div className="catalog-toolbar">
          <form className="product-search" method="get">
            
            <input
              defaultValue={query}
              id="product-search"
              maxLength={100}
              name="q"
              placeholder="Rechercher un produit"
              type="search"
            />
            <select aria-label="Catégorie" defaultValue={params.categorie ?? ""} name="categorie">
              <option value="">Toutes les catégories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select aria-label="État" defaultValue={params.etat ?? ""} name="etat">
              <option value="">Tous les produits actifs</option>
              {Object.values(ProductAvailability).map((state) => (
                <option key={state} value={state}>{availabilityLabel(state)}</option>
              ))}
              <option value="archived">Archivés</option>
            </select>
            <SubmitButton className="secondary-button" pendingLabel="Filtrage…">
              Filtrer
            </SubmitButton>
          </form>
          <details className="catalog-tools">
            <summary>Outils du catalogue</summary>
            <div className="catalog-tools-content">
              <a className="secondary-button" href="/api/dashboard/produits/export">
                Exporter le CSV
              </a>
              <form action="/api/dashboard/produits/import" className="csv-import-form" encType="multipart/form-data" method="post">
                <label htmlFor="csv-import">Fichier CSV (5 Mo max)</label>
                <input accept=".csv,text/csv" id="csv-import" name="file" required type="file" />
                <SubmitButton className="secondary-button" pendingLabel="Importation…">
                  Importer
                </SubmitButton>
              </form>
              <form action={createCategory} className="category-create-form">
                <label htmlFor="new-category">Nouvelle catégorie</label>
                <input id="new-category" maxLength={80} minLength={2} name="name" placeholder="Ex. Robes" required />
                <SubmitButton className="secondary-button" pendingLabel="Ajout…">
                  Ajouter la catégorie
                </SubmitButton>
              </form>
            </div>
          </details>
        </div>
        <ProductTable products={products} canManage={membership.role !== "ORDER_PREPARER"} />
        {products.length === 0 && (
          <div className="empty-state">
            <h2>{query || params.categorie || availability ? "Aucun résultat" : "Tes prochains clients t’attendent."}</h2>
            <p>
              {query || params.categorie || availability
                ? "Essaie de modifier tes filtres."
                : "Ajoute ton premier produit pour commencer à faire vivre ta boutique."}
            </p>
            {membership.role !== "ORDER_PREPARER" && (
              <Link className="primary-button" href="/dashboard/produits/nouveau">
                Ajouter un produit
              </Link>
            )}
          </div>
        )}
        {total > pageSize && (
          <nav aria-label="Pages de produits" className="pagination">
            {currentPage > 1 && (
              <a className="secondary-button" href={queryString({ q: query, categorie: params.categorie, etat: params.etat, page: String(currentPage - 1) })}>
                Page précédente
              </a>
            )}
            <span>Page {currentPage} sur {Math.ceil(total / pageSize)}</span>
            {currentPage * pageSize < total && (
              <a className="secondary-button" href={queryString({ q: query, categorie: params.categorie, etat: params.etat, page: String(currentPage + 1) })}>
                Page suivante
              </a>
            )}
          </nav>
        )}
      </section>
    </DashboardShell>
  );
}

function availabilityLabel(availability: ProductAvailability) {
  return {
    AVAILABLE: "Disponible",
    SOLD_OUT: "Épuisé",
    PREORDER: "Sur commande",
  }[availability];
}

function queryString(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  return `/dashboard/produits?${params.toString()}`;
}

export { formatXaf };
