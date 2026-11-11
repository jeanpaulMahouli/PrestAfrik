import { Store } from "lucide-react";
import { storePublicUrl } from "@/lib/urls";
import { getTopStores } from "@/modules/marketplace/search";
import { bestStores } from "./content";

/**
 * « Visitez nos meilleures boutiques » : les 5 boutiques en ligne les mieux classées (avis clients, puis
 * produits en ligne ; voir getTopStores), chacune dans un cercle avec son logo. Rien n'est affiché sans boutique.
 */
export async function BestStores() {
  const stores = await getTopStores(bestStores.count).catch(() => []);
  if (!stores.length) return null;

  return (
    <section aria-labelledby="best-stores-title" className="lp-best-stores">
      <h2 className="lp-best-stores__title" id="best-stores-title">
        {bestStores.title}
      </h2>
      <ul className="lp-best-stores__list">
        {stores.map((store) => {
          const initials = store.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toLocaleUpperCase("fr-FR"))
            .join("");
          return (
            <li key={store.id}>
              <a className="lp-best-store" href={storePublicUrl(store.slug)} rel="noopener" target="_blank">
                <span aria-hidden="true" className="lp-best-store__circle">
                  {/* Logos déjà optimisés (WebP) : affichés tels quels. */}
                  {store.logoUrl ? <img alt="" height={120} loading="lazy" src={store.logoUrl} width={120} /> : initials || <Store size={32} />}
                </span>
                <span className="lp-best-store__name">{store.name}</span>
                {store.city && <span className="lp-best-store__city">{store.city}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
