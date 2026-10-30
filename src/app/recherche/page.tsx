import type { Metadata } from "next";
import Link from "next/link";
import { LandingButton } from "@/components/landing/buttons";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";
import { VendorSearch } from "@/components/marketplace/vendor-search";
import { StoreCard } from "@/components/marketplace/store-card";
import { getTopProducts, parseSearchQuery, searchStores } from "@/modules/marketplace/search";

const pageSize = 8;
const popularCities = ["Douala", "Yaoundé", "Libreville", "Brazzaville", "N’Djamena", "Bangui"];
const popularActivities = ["Mode", "Beauté", "Alimentation", "Maison", "Électronique"];

type Params = { q?: string | string[]; ville?: string | string[]; activite?: string | string[]; page?: string | string[] };
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const params = await searchParams;
  const query = parseSearchQuery(one(params.q));
  if (!query) return { title: "Rechercher un vendeur", robots: { index: false, follow: true }, alternates: { canonical: "/recherche" } };
  const { total } = await searchStores(query);
  return {
    title: `Boutiques « ${query} »`,
    description: `${total} boutique${total > 1 ? "s" : ""} PrestAfrik pour « ${query} » : produits, ville et commande sur WhatsApp, paiement à la livraison.`,
    // Pages de résultats vides : jamais indexées.
    robots: total === 0 ? { index: false, follow: true } : undefined,
  };
}

/** Résultats de la recherche de vendeurs : boutiques publiées, avec leurs produits les mieux notés. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const signedIn = await isSignedIn();
  const query = parseSearchQuery(one(params.q));
  const filters = { city: one(params.ville) || undefined, activity: one(params.activite) || undefined };
  const page = Math.max(1, Number(one(params.page)) || 1);
  const result = query ? await searchStores(query, filters) : null;
  const visible = result ? result.stores.slice(0, page * pageSize) : [];
  const products = await Promise.all(visible.map((store) => getTopProducts(store.id)));
  const href = (patch: Partial<Record<"ville" | "activite" | "page", string | undefined>>) => {
    const search = new URLSearchParams({ q: query ?? "" });
    const merged = { ville: filters.city, activite: filters.activity, ...patch };
    for (const [key, value] of Object.entries(merged)) if (value) search.set(key, value);
    return `/recherche?${search}`;
  };

  return (
    <PageShell
      className="lp-page--search"
      hero={{
        title: !result ? "Trouvez un vendeur près de chez vous" : result.total === 0 ? `Pas encore de boutique pour « ${query} »` : `${result.total} boutique${result.total > 1 ? "s" : ""} pour « ${query} »`,
        subtitle: result?.total
          ? "Touchez une boutique pour voir ses produits et commander : la commande se confirme sur WhatsApp, vous payez à la livraison."
          : "Cherchez par nom de boutique, par ville ou par activité (pagne, beauté, électronique…).",
        actions: <VendorSearch className="vendor-search--hero" defaultValue={query ?? ""} />,
      }}
      signedIn={signedIn}
    >
      <section aria-label="Résultats" className="lp-section search-results">
        {result && (result.facets.cities.length > 1 || result.facets.activities.length > 1 || filters.city || filters.activity) && (
          <nav aria-label="Filtrer les résultats" className="search-filters">
            <FilterGroup active={filters.city} href={(value) => href({ ville: value, page: undefined })} label="Ville" values={result.facets.cities} />
            <FilterGroup active={filters.activity} href={(value) => href({ activite: value, page: undefined })} label="Activité" values={result.facets.activities} />
          </nav>
        )}

        {!query && <Suggestions />}

        {result && result.total === 0 && (
          <div className="search-empty">
            <h2>Aucune boutique ne correspond à « {query} » pour le moment</h2>
            <p>Essayez un autre mot, une ville ou une activité :</p>
            <Suggestions />
            <div className="search-empty-cta">
              <p>Vous êtes vendeur ? Votre boutique pourrait être la première à apparaître ici.</p>
              <LandingButton href="/inscription">Créer ma boutique gratuitement</LandingButton>
            </div>
          </div>
        )}

        {visible.length > 0 && (
          <ul className="search-grid">
            {visible.map((store, index) => (
              <li key={store.id}>
                <StoreCard products={products[index] ?? []} store={store} />
              </li>
            ))}
          </ul>
        )}

        {result && visible.length < result.total && (
          <p className="search-more">
            <Link className="lp-btn lp-btn--secondary" href={href({ page: String(page + 1) })} scroll={false}>
              Voir plus de boutiques ({result.total - visible.length} de plus)
            </Link>
          </p>
        )}
      </section>
    </PageShell>
  );
}

function FilterGroup({ label, values, active, href }: { label: string; values: string[]; active?: string; href: (value?: string) => string }) {
  if (values.length < 2 && !active) return null;
  return (
    <div className="search-filter">
      <span>{label} :</span>
      <Link aria-current={!active ? "true" : undefined} href={href(undefined)}>
        Toutes
      </Link>
      {values.map((value) => (
        <Link aria-current={active === value ? "true" : undefined} href={href(value)} key={value}>
          {value}
        </Link>
      ))}
    </div>
  );
}

function Suggestions() {
  return (
    <div className="search-suggestions">
      {[...popularCities, ...popularActivities].map((term) => (
        <Link href={`/recherche?q=${encodeURIComponent(term)}`} key={term}>
          {term}
        </Link>
      ))}
    </div>
  );
}
