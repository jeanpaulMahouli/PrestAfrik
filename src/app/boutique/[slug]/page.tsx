import Link from "next/link";
import { notFound } from "next/navigation";
import { StorefrontProductGrid } from "@/components/storefront/storefront-product-grid";
import { formatXaf, getPublishedProducts, getStorefrontStore } from "@/modules/catalog/service";
import { deliverySummary, getStorefrontExtras } from "@/modules/storefront/data";

export async function generateMetadata({ params }: PageProps<"/boutique/[slug]">) {
  const { slug } = await params;
  const store = await getStorefrontStore(slug);
  return {
    title: store ? store.name : "Boutique introuvable",
    description: store?.description ?? `Découvrez les produits de ${store?.name ?? "cette boutique"} et commandez en quelques secondes.`,
    ...(store?.isPreview ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function PublicStorePage({ params, searchParams }: PageProps<"/boutique/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const store = await getStorefrontStore(slug);
  if (!store) notFound();

  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const category = typeof query.categorie === "string" ? query.categorie.slice(0, 90) : undefined;
  const [products, extras] = await Promise.all([getPublishedProducts(store.id, { category, query: search }), getStorefrontExtras(store.id)]);
  const home = `/boutique/${store.slug}`;

  return (
    <main className="sf-home">
      {store.theme === "BOUTIQUE_MARQUE" && (
        <section className="sf-hero">
          <h1>{store.name}</h1>
          {store.description && <p>{store.description}</p>}
        </section>
      )}
      {store.theme !== "BOUTIQUE_MARQUE" && <h1 className="visually-hidden">{store.name}</h1>}
      {store.theme !== "BOUTIQUE_MARQUE" && store.description && <p className="sf-description">{store.description}</p>}

      <form action={home} className="sf-search" role="search">
        <label className="visually-hidden" htmlFor="sf-search">Rechercher un produit</label>
        <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="18"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input defaultValue={search} id="sf-search" maxLength={100} name="q" placeholder="Rechercher un produit" type="search" />
        {category && <input name="categorie" type="hidden" value={category} />}
      </form>

      {store.categories.length > 0 && (
        <nav aria-label="Catégories" className="sf-chips">
          <Link aria-current={category ? undefined : "page"} href={home}>Tout</Link>
          {store.categories.map((item) => (
            <Link aria-current={category === item.slug ? "page" : undefined} href={`${home}?categorie=${encodeURIComponent(item.slug)}`} key={item.id}>
              {item.name}
            </Link>
          ))}
        </nav>
      )}

      <p className="sf-info">{deliverySummary(extras, formatXaf)}</p>

      {products.length ? (
        <StorefrontProductGrid products={products} storeSlug={store.slug} />
      ) : (
        <section className="sf-empty">
          <h2>{search || category ? "Aucun produit trouvé" : "La boutique prépare son catalogue"}</h2>
          <p>{search ? "Essayez un autre mot." : category ? "Essayez une autre catégorie." : "Les produits apparaîtront ici très bientôt."}</p>
          {(search || category) && <Link className="sf-btn sf-btn-secondary" href={home}>Voir tous les produits</Link>}
        </section>
      )}
    </main>
  );
}
