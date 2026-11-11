import { Store } from "lucide-react";
import { storePublicUrl } from "@/lib/urls";
import { getMostVisitedStores } from "@/modules/marketplace/search";
import { bestStores } from "./content";

/**
 * « Visitez nos meilleures boutiques » : les 5 boutiques en ligne les plus visitées (voir getMostVisitedStores),
 * de la plus visitée à la moins visitée, chacune dans un cercle avec son logo. Le nom reste lu par les lecteurs
 * d'écran et s'affiche au survol. Rien n'est affiché sans boutique.
 */
export async function BestStores() {
  const stores = await getMostVisitedStores(bestStores.count).catch(() => []);
  if (!stores.length) return null;

  return (
    <section aria-labelledby="best-stores-title" className="lp-best-stores">
      <h2 className="lp-best-stores__title" id="best-stores-title">
        {bestStores.title}
      </h2>
      <ol className="lp-best-stores__list">
        {stores.map((store) => {
          const initials = store.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toLocaleUpperCase("fr-FR"))
            .join("");
          const label = store.city ? `${store.name}, ${store.city}` : store.name;
          return (
            <li key={store.id}>
              <a aria-label={`${label} (nouvel onglet)`} className="lp-best-store" href={storePublicUrl(store.slug)} rel="noopener" target="_blank" title={label}>
                {/* Logos déjà optimisés (WebP) : affichés tels quels. */}
                {store.logoUrl ? <img alt="" height={96} loading="lazy" src={store.logoUrl} width={96} /> : <span aria-hidden="true">{initials || <Store size={24} />}</span>}
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
