import { Download, Upload } from "lucide-react";
import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { ProductList } from "@/components/catalog/product-list";
import { Pagination } from "@/components/ui/pagination";
import { photoVariant } from "@/lib/product-photos";
import { hasPermission } from "@/modules/auth/permissions";
import { archiveProducts, deleteProducts, duplicateProduct, restoreProducts, toggleFeaturedProduct } from "@/modules/catalog/actions";
import { listVendorProducts, parseProductFilters, productTabs, productsPageSize } from "@/modules/catalog/queries";
import { requireStorePermission } from "@/modules/stores/context";

export const metadata = { title: "Mes produits" };

function successMessage(params: Record<string, string | string[] | undefined>) {
  const n = Number(params.n) || 0;
  switch (params.succes) {
    case "ajoute":
      return "Produit ajouté. On avance !";
    case "modifie":
      return "Modifications enregistrées. Vos clients voient déjà les changements.";
    case "archive":
      return `${n} produit${n > 1 ? "s" : ""} archivé${n > 1 ? "s" : ""}. Restaurable à tout moment depuis l’onglet Archivés.`;
    case "mis-en-avant":
      return "Produit mis en avant : il apparaît dans « Nos produits mis en avant » sur l’accueil de votre boutique.";
    case "retire-avant":
      return "Le produit n’est plus mis en avant.";
    case "restaure":
      return `${n} produit${n > 1 ? "s" : ""} restauré${n > 1 ? "s" : ""} en brouillon.`;
    case "supprime": {
      const archived = Number(params.archives) || 0;
      return `${n} produit${n > 1 ? "s" : ""} supprimé${n > 1 ? "s" : ""} définitivement.${archived ? ` ${archived} déjà commandé${archived > 1 ? "s" : ""}, donc archivé${archived > 1 ? "s" : ""} à la place.` : ""}`;
    }
    default:
      return null;
  }
}

export default async function ProductsPage({ searchParams }: PageProps<"/dashboard/produits">) {
  const { store, membership } = await requireStorePermission("products.read");
  const params = await searchParams;
  const filters = parseProductFilters(params);
  const { products, total, countByStatus, categories } = await listVendorProducts(store.id, filters);
  const canManage = hasPermission(membership.role, "products.manage");
  const success = successMessage(params);
  const error = typeof params.erreur === "string" ? (params.erreur === "selection-vide" ? "Sélectionnez au moins un produit." : params.erreur === "non-autorise" ? "Vous n’avez pas l’autorisation de modifier le catalogue." : params.erreur) : null;
  const query = (overrides: Record<string, string | number>) => {
    const next = new URLSearchParams({
      onglet: filters.tab,
      ...(filters.query ? { q: filters.query } : {}),
      ...(filters.categoryId ? { categorie: filters.categoryId } : {}),
      ...(filters.availability ? { disponibilite: filters.availability } : {}),
    });
    for (const [key, value] of Object.entries(overrides)) next.set(key, String(value));
    return `/dashboard/produits?${next.toString()}`;
  };
  const filtered = Boolean(filters.query || filters.categoryId || filters.availability);

  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Mes produits</h1>
          <p className="v-page-subtitle">
            Ajoutez, modifiez ou retirez vos produits en quelques clics. Chaque changement apparaît tout de suite dans votre boutique.
          </p>
        </div>
        {canManage && (
          <div className="v-page-actions v-page-actions-inline">
            <Link aria-label="Importer des produits (fichier CSV)" className="icon-button" href="/dashboard/produits/import" title="Importer des produits (CSV)">
              <Upload aria-hidden="true" size={18} />
            </Link>
            <a aria-label="Exporter mes produits (fichier CSV)" className="icon-button" download href="/api/dashboard/produits/export" title="Exporter mes produits (CSV)">
              <Download aria-hidden="true" size={18} />
            </a>
            <Link className="btn btn-primary" href="/dashboard/produits/nouveau">+ Ajouter un produit</Link>
          </div>
        )}
      </div>

      {success && <p className="v-banner v-banner-success" role="status">{success}</p>}
      {error && <p className="v-banner v-banner-danger" role="alert">{error}</p>}

      <nav aria-label="État des produits" className="pill-tabs">
        {productTabs.map((item) => (
          <Link aria-current={filters.tab === item.key ? "page" : undefined} href={`/dashboard/produits?onglet=${item.key}`} key={item.key}>
            {item.label} ({countByStatus[item.status] ?? 0})
          </Link>
        ))}
      </nav>

      <section className="v-card v-card-flush">
        <form className="list-filters" role="search">
          <input name="onglet" type="hidden" value={filters.tab} />
          <label className="visually-hidden" htmlFor="product-search">Rechercher un produit</label>
          <input defaultValue={filters.query} id="product-search" maxLength={80} name="q" placeholder="Rechercher un produit par nom ou référence" type="search" />
          <label className="visually-hidden" htmlFor="product-category">Catégorie</label>
          <select defaultValue={filters.categoryId} id="product-category" name="categorie">
            <option value="">Catégorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <label className="visually-hidden" htmlFor="product-availability">Disponibilité</label>
          <select defaultValue={filters.availability} id="product-availability" name="disponibilite">
            <option value="">Disponibilité</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="SOLD_OUT">Épuisé</option>
            <option value="PREORDER">Sur commande</option>
          </select>
          <button className="btn btn-secondary" type="submit">Filtrer</button>
        </form>

        {products.length ? (
          <ProductList
            actions={{ archive: archiveProducts, restore: restoreProducts, remove: deleteProducts, duplicate: duplicateProduct, feature: toggleFeaturedProduct }}
            canManage={canManage}
            rows={products.map((product) => ({
              id: product.id,
              name: product.name,
              slug: product.slug,
              sku: product.sku,
              status: product.status,
              availability: product.availability,
              stock: product.trackInventory
                ? product.variants.some((variant) => variant.stockQuantity !== null)
                  ? product.variants.reduce((sum, variant) => sum + (variant.stockQuantity ?? 0), 0)
                  : product.stockQuantity
                : null,
              priceXaf: product.priceXaf,
              promotionalPriceXaf: product.promotionalPriceXaf,
              isFeatured: product.isFeatured,
              thumbnail: product.images[0] ? photoVariant(product.images[0].url, 320) : null,
              photoCount: product._count.images,
              orderCount: product._count.orderItems,
            }))}
            storePublished={store.isPublished}
            storeSlug={store.slug}
            tab={filters.tab}
          />
        ) : (
          <div className="v-empty">
            {filtered ? (
              <>
                <h2>Aucun produit ne correspond</h2>
                <p>Essayez un autre mot-clé ou retirez les filtres.</p>
                <Link className="btn btn-secondary" href={`/dashboard/produits?onglet=${filters.tab}`}>Retirer les filtres</Link>
              </>
            ) : filters.tab === "actifs" ? (
              <>
                <h2>Votre vitrine attend ses premiers produits</h2>
                <p>Ajoutez votre premier produit avec jusqu’à 5 photos : vos clients vont adorer !</p>
                {canManage && <Link className="btn btn-primary" href="/dashboard/produits/nouveau">+ Ajouter un produit</Link>}
              </>
            ) : (
              <>
                <h2>{filters.tab === "brouillons" ? "Aucun brouillon" : "Aucun produit archivé"}</h2>
                <p>{filters.tab === "brouillons" ? "Les produits enregistrés en brouillon apparaîtront ici avant leur mise en ligne." : "Les produits archivés disparaissent de la boutique mais restent dans vos commandes."}</p>
              </>
            )}
          </div>
        )}
      </section>
      <Pagination href={(page) => query({ page })} page={filters.page} pageSize={productsPageSize} total={total} />
    </VendorShell>
  );
}
