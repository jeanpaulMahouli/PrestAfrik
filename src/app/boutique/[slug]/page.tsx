import { notFound } from "next/navigation";
import { StorefrontProductGrid } from "@/components/storefront/storefront-product-grid";
import { SubmitButton } from "@/components/ui/submit-button";
import { getPublishedProducts, getStorefrontStore } from "@/modules/catalog/service";

export async function generateMetadata({ params }: PageProps<"/boutique/[slug]">) {
  const { slug } = await params;
  const store = await getStorefrontStore(slug);
  return {
    title: store ? store.name : "Boutique introuvable",
    description: store?.description ?? `Découvre les produits de ${store?.name ?? "cette boutique"}.`,
    ...(store?.isPreview ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function PublicStorePage({
  params,
  searchParams,
}: PageProps<"/boutique/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const store = await getStorefrontStore(slug);
  if (!store) notFound();

  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const category = typeof query.categorie === "string" ? query.categorie.slice(0, 90) : undefined;
  const products = await getPublishedProducts(store.id, { category, query: search });

  return (
    <main className={`storefront-content theme-${store.theme.toLowerCase().replaceAll("_", "-")}`}>
      {store.description && <p className="storefront-description">{store.description}</p>}
      <form className="storefront-search" method="get">
        <label className="visually-hidden" htmlFor="storefront-search">
          Rechercher un produit
        </label>
        <input defaultValue={search} id="storefront-search" maxLength={100} name="q" placeholder="Rechercher un produit" type="search" />
        <SubmitButton className="secondary-button" pendingLabel="Recherche…">
          Rechercher
        </SubmitButton>
      </form>

      {store.categories.length > 0 && (
        <nav aria-label="Catégories" className="storefront-categories">
          <a aria-current={category ? undefined : "page"} href={`/boutique/${store.slug}`}>Tout</a>
          {store.categories.map((item) => (
            <a
              aria-current={category === item.slug ? "page" : undefined}
              href={`/boutique/${store.slug}?categorie=${encodeURIComponent(item.slug)}`}
              key={item.id}
            >
              {item.name}
            </a>
          ))}
        </nav>
      )}

      <p className="storefront-delivery-notice">
        Paiement à la livraison. Les frais éventuels sont confirmés avant la commande.
      </p>
      {products.length ? (
        <StorefrontProductGrid products={products} storeSlug={store.slug} />
      ) : (
        <section className="empty-state storefront-empty">
          <h1>{search || category ? "Aucun produit trouvé" : "Cette boutique prépare son catalogue."}</h1>
          <p>{search ? "Essaie un autre mot pour ta recherche." : "Les produits disponibles apparaîtront ici."}</p>
        </section>
      )}
    </main>
  );
}
