import { ArrowRight, Check, House, MagnifyingGlass, X } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { ShopProductCard } from "@/components/shop/product-card";
import { StoreTile } from "@/components/shop/shop-blocks";
import { FiltersPanel, SortSelect } from "@/components/shop/shop-filters";
import { ShopShell, shopBudgets } from "@/components/shop/shop-shell";
import { AdBanner, ShowcaseHead } from "@/components/shop/shop-showcase";
import { marketplaceAds, slotAd } from "@/config/marketplace-ads";
import { sharePreviewImage } from "@/lib/seo";
import { shopUrl } from "@/lib/urls";
import { formatXaf } from "@/modules/catalog/format";
import { getShopAnnouncements, getShopTicker, getShopTickerSeconds } from "@/modules/announcements/queries";
import { getShopScope } from "@/modules/marketplace/country";
import { exploreShop, getShopCategories, getShopHome, scopedStores, shopSorts, type ShopSort } from "@/modules/marketplace/shop";

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

/** Une page catégorie n'est indexée qu'à partir de ce nombre de boutiques actives (contenu suffisant). */
const indexableCategoryStores = 3;

export async function generateMetadata({ searchParams }: PageProps<"/nos-boutiques/recherche">): Promise<Metadata> {
  const query = readQuery(await searchParams);
  const categories = query.category ? await getShopCategories(await getShopScope()) : [];
  const category = categories.find((item) => item.slug === query.category);
  // Page catégorie seule (sans recherche, budget ni tri) : la seule page de résultats proposée à Google.
  const categoryPage = category && !query.q && !query.min && !query.max && !query.promo && query.sort === "pertinence";
  if (categoryPage) {
    const label = category.label.toLocaleLowerCase("fr-FR");
    return {
      title: { absolute: `${category.label} au Cameroun : commandez sur WhatsApp | PrestAfrik` },
      description: `${category.label} : ${category.productCount} produit${category.productCount > 1 ? "s" : ""} de ${category.storeCount} boutique${category.storeCount > 1 ? "s" : ""} sur PrestAfrik. Comparez, écrivez au vendeur sur WhatsApp et payez à la livraison.`.slice(0, 160),
      alternates: { canonical: shopUrl(`/recherche?categorie=${category.slug}`) },
      openGraph: {
        type: "website",
        siteName: "PrestAfrik",
        locale: "fr_CM",
        url: shopUrl(`/recherche?categorie=${category.slug}`),
        title: `${category.label} sur PrestAfrik`,
        description: `Les boutiques ${label} de PrestAfrik : commande sur WhatsApp, paiement à la livraison.`,
        images: [sharePreviewImage],
      },
      // Trop peu de boutiques : la page reste accessible mais n'est pas proposée à Google.
      robots: category.storeCount >= indexableCategoryStores ? undefined : { index: false, follow: true },
    };
  }
  const title = query.q ? `« ${query.q} »` : category?.label ?? "Explorer la marketplace";
  return {
    title: { absolute: `${title} | PrestAfrik` },
    description: "Trouvez un produit sur PrestAfrik, la marketplace du Cameroun : contactez directement le vendeur sur WhatsApp et payez à la livraison.",
    // Recherche, tri et budget : pages utiles aux visiteurs, pas aux moteurs de recherche.
    robots: { index: false, follow: true },
  };
}

/** Explorer la marketplace : recherche, rubrique, budget et tri, produits puis boutiques correspondantes. */
export default async function ShopSearchPage({ searchParams }: PageProps<"/nos-boutiques/recherche">) {
  const query = readQuery(await searchParams);
  const shopScope = await getShopScope();
  const [categories, result, scope, ticker, home, visuals] = await Promise.all([getShopCategories(shopScope), exploreShop(query, shopScope), scopedStores(shopScope), getShopTicker(), getShopHome(shopScope), getShopAnnouncements()]);
  const tickerSeconds = await getShopTickerSeconds();
  const title = query.q ? `Résultats pour « ${query.q} »` : result.category ? result.category.label : query.promo ? "Promotions" : query.sort !== "pertinence" ? shopSorts[query.sort] : "Tous les produits";
  // Lien vers la même recherche avec un réglage changé (les autres sont gardés).
  const withParam = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { q: query.q || undefined, categorie: query.category, min: query.min?.toString(), max: query.max?.toString(), tri: query.sort === "pertinence" ? undefined : query.sort, promo: query.promo ? "1" : undefined, ...changes };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    const search = next.toString();
    return shopUrl(`/recherche${search ? `?${search}` : ""}`);
  };
  const count = result.products.length;
  const budgetLabel = query.min && query.max ? `${formatXaf(query.min)} à ${formatXaf(query.max)}` : query.max ? `Moins de ${formatXaf(query.max)}` : query.min ? `${formatXaf(query.min)} et plus` : null;
  // Filtres en cours, chacun avec son lien pour le retirer.
  const active = [
    query.q && { label: `« ${query.q} »`, href: withParam({ q: undefined }) },
    result.category && { label: result.category.label, href: withParam({ categorie: undefined }) },
    budgetLabel && { label: budgetLabel, href: withParam({ min: undefined, max: undefined }) },
    query.promo && { label: "Promotions", href: withParam({ promo: undefined }) },
  ].filter((item): item is { label: string; href: string } => Boolean(item));
  const isBudget = (budget: (typeof shopBudgets)[number]) => ("max" in budget ? query.max === budget.max && !query.min : query.min === budget.min && !query.max);
  const menu = new Map(home.sections.map(({ category, products }) => [category.slug, products]));
  const hidden = (names: string[]) => (
    <>
      {!names.includes("q") && query.q && <input name="q" type="hidden" value={query.q} />}
      {!names.includes("categorie") && query.category && <input name="categorie" type="hidden" value={query.category} />}
      {!names.includes("tri") && query.sort !== "pertinence" && <input name="tri" type="hidden" value={query.sort} />}
      {!names.includes("promo") && query.promo && <input name="promo" type="hidden" value="1" />}
      {!names.includes("prix") && query.min && <input name="min" type="hidden" value={query.min} />}
      {!names.includes("prix") && query.max && <input name="max" type="hidden" value={query.max} />}
    </>
  );

  return (
    <ShopShell
      active={result.category?.slug ?? (query.promo || query.sort === "promo" ? "promo" : query.sort === "mieux-notes" ? "notes" : query.sort === "nouveautes" ? "nouveautes" : undefined)}
      categories={categories}
      local={scope.local}
      menu={menu}
      query={query.q}
      scope={shopScope}
      ticker={ticker}
      tickerSeconds={tickerSeconds}
    >
      <nav aria-label="Fil d’Ariane" className="sx-crumbs">
        <ol className="sx-wrap">
          <li>
            <a href={shopUrl("/")}>
              <House aria-hidden="true" size={20} /> Accueil
            </a>
          </li>
          <li>
            <a aria-current={!result.category ? "page" : undefined} href={shopUrl("/recherche")}>
              Explorer
            </a>
          </li>
          {result.category && (
            <li>
              <span aria-current="page">{result.category.label}</span>
            </li>
          )}
        </ol>
      </nav>

      <div className="sx-wrap sx-results">
        <FiltersPanel activeCount={active.length}>
          <section aria-labelledby="filtre-categories" className="sx-filter">
            <h2 id="filtre-categories">Catégories</h2>
            <ul className="sx-radios">
              <li>
                <a aria-current={!query.category ? "true" : undefined} href={withParam({ categorie: undefined })}>
                  Toutes les catégories
                </a>
              </li>
              {categories.map((category) => (
                <li key={category.slug}>
                  <a aria-current={query.category === category.slug ? "true" : undefined} href={withParam({ categorie: category.slug })}>
                    {category.label} <small>{category.productCount}</small>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="filtre-prix" className="sx-filter">
            <h2 id="filtre-prix">Votre budget</h2>
            <form action={shopUrl("/recherche")} className="sx-price-form">
              {hidden(["prix"])}
              <label>
                <span className="visually-hidden">Prix minimum en FCFA</span>
                <input defaultValue={query.min} inputMode="numeric" min={1} name="min" placeholder="Prix min." type="number" />
              </label>
              <label>
                <span className="visually-hidden">Prix maximum en FCFA</span>
                <input defaultValue={query.max} inputMode="numeric" min={1} name="max" placeholder="Prix max." type="number" />
              </label>
              <button className="sx-btn sx-btn-primary sx-btn-small" type="submit">
                Appliquer
              </button>
            </form>
            <ul className="sx-radios">
              <li>
                <a aria-current={!query.min && !query.max ? "true" : undefined} href={withParam({ min: undefined, max: undefined })}>
                  Tous les prix
                </a>
              </li>
              {shopBudgets.map((budget) => (
                <li key={budget.label}>
                  <a aria-current={isBudget(budget) ? "true" : undefined} href={"max" in budget ? withParam({ max: String(budget.max), min: undefined }) : withParam({ min: String(budget.min), max: undefined })}>
                    {budget.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="filtre-offres" className="sx-filter">
            <h2 id="filtre-offres">Offres</h2>
            <a aria-pressed={query.promo} className="sx-toggle" href={withParam({ promo: query.promo ? undefined : "1" })} role="button">
              <span aria-hidden="true" className="sx-toggle-box">
                <Check size={14} weight="bold" />
              </span>
              Promotions seulement
            </a>
          </section>

          <section aria-labelledby="filtre-tags" className="sx-filter">
            <h2 id="filtre-tags">Recherches fréquentes</h2>
            <ul className="sx-tags">
              {categories.slice(0, 8).map((category) => (
                <li key={category.slug}>
                  <a aria-current={query.category === category.slug ? "true" : undefined} href={withParam({ categorie: category.slug, q: undefined })}>
                    {category.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <AdBanner ad={slotAd(visuals.slots.searchSide, marketplaceAds.searchSide)} className="sx-filter-ad" />
        </FiltersPanel>

        <section aria-labelledby="resultats-title" className="sx-results-main">
          <div className="sx-results-tools">
            <form action={shopUrl("/recherche")} className="sx-inline-search" role="search">
              {hidden(["q"])}
              <label className="visually-hidden" htmlFor="sx-q">
                Rechercher dans les produits
              </label>
              <input defaultValue={query.q} id="sx-q" name="q" placeholder="Rechercher un produit…" type="search" />
              <button aria-label="Lancer la recherche" type="submit">
                <MagnifyingGlass aria-hidden="true" size={20} />
              </button>
            </form>
            <SortSelect current={query.sort} options={(Object.keys(shopSorts) as ShopSort[]).map((sort) => ({ value: sort, label: shopSorts[sort], href: withParam({ tri: sort === "pertinence" ? undefined : sort }) }))} />
          </div>

          <div className="sx-active">
            {active.length > 0 ? (
              <>
                <span>Filtres :</span>
                <ul>
                  {active.map((item) => (
                    <li key={item.label}>
                      <a aria-label={`Retirer le filtre ${item.label}`} href={item.href}>
                        {item.label} <X aria-hidden="true" size={14} />
                      </a>
                    </li>
                  ))}
                </ul>
                <a className="sx-active-clear" href={shopUrl("/recherche")}>
                  Tout effacer
                </a>
              </>
            ) : (
              <span>Aucun filtre : tous les produits de la marketplace.</span>
            )}
            <p className="sx-active-count">
              <strong>{count}</strong> produit{count > 1 ? "s" : ""} trouvé{count > 1 ? "s" : ""}
              {count === 48 ? " (affinez pour en voir d’autres)" : ""}
            </p>
          </div>

          <h1 className="sx-results-title" id="resultats-title">
            {title}
          </h1>

          {count > 0 ? (
            <ul aria-label={title} className="sx-grid sx-results-grid">
              {result.products.map((product, index) => (
                <li key={product.id}>
                  <ShopProductCard priority={index < 4} product={product} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="sx-empty">
              <MagnifyingGlass aria-hidden="true" size={48} />
              <p>
                <strong>Aucun produit ne correspond pour l’instant.</strong>
              </p>
              <p>Essayez un autre mot, retirez un filtre, ou parcourez les catégories.</p>
              <a className="sx-btn sx-btn-primary" href={shopUrl("/")}>
                Revenir à l’accueil <ArrowRight aria-hidden="true" size={20} />
              </a>
            </div>
          )}

          {result.stores.length > 0 && (
            <section aria-labelledby="resultats-boutiques" className="sx-section">
              <ShowcaseHead id="resultats-boutiques" title={result.category ? `Boutiques ${result.category.label.toLocaleLowerCase("fr-FR")}` : "Boutiques correspondantes"} />
              <ul className="stores-tiles">
                {result.stores.map((store) => (
                  <li key={store.id}>
                    <StoreTile store={store} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
      </div>
    </ShopShell>
  );
}
