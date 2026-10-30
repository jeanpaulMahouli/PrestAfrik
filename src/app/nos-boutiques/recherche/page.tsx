import { PackageSearch, Store } from "lucide-react";
import type { Metadata } from "next";
import { categoryIcon } from "@/components/shop/category-icons";
import { ProductGrid, ShopSectionHead, StoreTile } from "@/components/shop/shop-blocks";
import { ShopShell, shopBudgets } from "@/components/shop/shop-shell";
import { shopUrl } from "@/lib/urls";
import { getShopCountry } from "@/modules/marketplace/country";
import { exploreShop, getShopCategories, scopedStores, shopSorts, type ShopSort } from "@/modules/marketplace/shop";

export const dynamic = "force-dynamic";

type Params = Awaited<PageProps<"/nos-boutiques/recherche">["searchParams"]>;
const one = (params: Params, key: string) => {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
};
const amount = (value: string | undefined) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number < 100_000_000 ? number : undefined;
};

function readQuery(params: Params) {
  const q = (one(params, "q") ?? "").trim().slice(0, 60);
  const category = one(params, "categorie")?.slice(0, 60);
  const sort = (Object.hasOwn(shopSorts, one(params, "tri") ?? "") ? one(params, "tri") : "pertinence") as ShopSort;
  return { q, category, sort, min: amount(one(params, "min")), max: amount(one(params, "max")), promo: one(params, "promo") === "1" };
}

export async function generateMetadata({ searchParams }: PageProps<"/nos-boutiques/recherche">): Promise<Metadata> {
  const query = readQuery(await searchParams);
  const categories = query.category ? await getShopCategories((await getShopCountry())?.iso) : [];
  const label = categories.find((item) => item.slug === query.category)?.label;
  return {
    title: { absolute: `${query.q ? `« ${query.q} »` : label ?? "Explorer"} · PrestAfrik Shop` },
    // Pages de résultats : utiles aux visiteurs, pas aux moteurs (sauf les rubriques).
    robots: query.q || query.min || query.max ? { index: false, follow: true } : undefined,
    alternates: label ? { canonical: shopUrl(`/recherche?categorie=${query.category}`) } : undefined,
  };
}

/** Explorer la marketplace : recherche, rubrique, budget et tri, produits puis boutiques correspondantes. */
export default async function ShopSearchPage({ searchParams }: PageProps<"/nos-boutiques/recherche">) {
  const query = readQuery(await searchParams);
  const country = await getShopCountry();
  const [categories, result, scope] = await Promise.all([getShopCategories(country?.iso), exploreShop(query, country?.iso), scopedStores(country?.iso)]);
  const { icon, tint } = categoryIcon(result.category?.slug);
  const title = query.q ? `Résultats pour « ${query.q} »` : result.category ? result.category.label : query.promo ? "Promotions" : query.sort !== "pertinence" ? shopSorts[query.sort] : "Tous les produits";
  // Lien vers la même recherche avec un réglage changé (les autres sont gardés).
  const withParam = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { q: query.q || undefined, categorie: query.category, min: query.min?.toString(), max: query.max?.toString(), tri: query.sort === "pertinence" ? undefined : query.sort, promo: query.promo ? "1" : undefined, ...changes };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    const search = next.toString();
    return shopUrl(`/recherche${search ? `?${search}` : ""}`);
  };

  return (
    <ShopShell
      active={result.category?.slug ?? (query.promo || query.sort === "promo" ? "promo" : query.sort === "mieux-notes" ? "notes" : query.sort === "nouveautes" ? "nouveautes" : undefined)}
      categories={categories}
      country={country}
      local={scope.local}
      query={query.q}
    >
      <section aria-labelledby="resultats-title" className="shop-section shop-results">
        <ShopSectionHead
          icon={result.category ? icon : PackageSearch}
          id="resultats-title"
          subtitle={`${result.products.length} produit${result.products.length > 1 ? "s" : ""}${result.products.length === 48 ? " affichés (affinez pour en voir d’autres)" : ""}`}
          tint={result.category ? tint : undefined}
          title={title}
        />

        <div className="shop-filters">
          <nav aria-label="Trier" className="shop-chips">
            {(Object.keys(shopSorts) as ShopSort[]).map((sort) => (
              <a aria-current={query.sort === sort ? "true" : undefined} href={withParam({ tri: sort === "pertinence" ? undefined : sort })} key={sort}>
                {shopSorts[sort]}
              </a>
            ))}
          </nav>
          <nav aria-label="Budget" className="shop-chips">
            <a aria-current={!query.min && !query.max ? "true" : undefined} href={withParam({ min: undefined, max: undefined })}>
              Tous les prix
            </a>
            {shopBudgets.map((budget) => {
              const current = "max" in budget ? query.max === budget.max && !query.min : query.min === budget.min && !query.max;
              return (
                <a aria-current={current ? "true" : undefined} href={"max" in budget ? withParam({ max: String(budget.max), min: undefined }) : withParam({ min: String(budget.min), max: undefined })} key={budget.label}>
                  {budget.label}
                </a>
              );
            })}
          </nav>
        </div>

        {result.products.length > 0 ? (
          <ProductGrid label={title} products={result.products} />
        ) : (
          <div className="shop-empty">
            <p>Aucun produit ne correspond pour l’instant.</p>
            <p>
              Essayez un autre mot, un autre budget ou <a href={shopUrl("/")}>revenez à l’accueil de la marketplace</a>.
            </p>
          </div>
        )}
      </section>

      {result.stores.length > 0 && (
        <section aria-labelledby="resultats-boutiques" className="shop-section">
          <ShopSectionHead icon={Store} id="resultats-boutiques" title={result.category ? `Boutiques ${result.category.label.toLocaleLowerCase("fr-FR")}` : "Boutiques correspondantes"} />
          <ul className="stores-tiles">
            {result.stores.map((store) => (
              <li key={store.id}>
                <StoreTile store={store} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </ShopShell>
  );
}
