import { MapPin, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { defaultStoreCover } from "@/lib/store-cover";
import { shopUrl, storePublicUrl } from "@/lib/urls";
import { getMostVisitedStores } from "@/modules/marketplace/search";
import { LandingButton } from "./buttons";
import { partners } from "./content";

type ShowcaseStore = { id: string; name: string; slug: string; city: string | null; logoUrl: string | null; cover: string; products: number };

/** Les 20 boutiques les plus visitées qui ont un logo, avec leur couverture (bannière, photo de couverture ou image par défaut). */
async function loadShowcaseStores(): Promise<ShowcaseStore[]> {
  // Seulement les boutiques qui ont un logo : on en lit plus, puis on garde les 20 premières avec logo.
  const stores = (await getMostVisitedStores(partners.count * 4)).filter((store) => store.logoUrl).slice(0, partners.count);
  if (!stores.length) return [];
  const ids = stores.map((store) => store.id);
  const [banners, details, counts] = await Promise.all([
    prisma.storeBanner.findMany({ where: { storeId: { in: ids } }, orderBy: { position: "asc" }, select: { storeId: true, imageUrl: true } }),
    prisma.store.findMany({ where: { id: { in: ids } }, select: { id: true, bannerUrl: true } }),
    prisma.product.groupBy({ by: ["storeId"], where: { storeId: { in: ids }, status: "ACTIVE", archivedAt: null }, _count: { _all: true } }),
  ]);
  const firstBanner = new Map<string, string>();
  for (const banner of banners) if (!firstBanner.has(banner.storeId)) firstBanner.set(banner.storeId, banner.imageUrl);
  const coverUrl = new Map(details.map((store) => [store.id, store.bannerUrl]));
  const productCount = new Map(counts.map((row) => [row.storeId, row._count._all]));
  return stores.map((store) => ({
    id: store.id,
    name: store.name,
    slug: store.slug,
    city: store.city,
    logoUrl: store.logoUrl,
    cover: firstBanner.get(store.id) ?? coverUrl.get(store.id) ?? defaultStoreCover,
    products: productCount.get(store.id) ?? 0,
  }));
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("fr-FR"))
    .join("");

/** Mini-bannière d'une boutique, au design de l'en-tête des boutiques publiques (couverture, logo rond, infos). */
function StoreMiniBanner({ store, hidden }: { store: ShowcaseStore; hidden: boolean }) {
  return (
    <a aria-hidden={hidden || undefined} className="lp-store" href={storePublicUrl(store.slug)} rel="noopener" tabIndex={hidden ? -1 : undefined} target="_blank">
      {/* Images déjà converties en WebP : affichées telles quelles. */}
      <span aria-hidden="true" className="lp-store__cover">
        <img alt="" decoding="async" height={150} loading="lazy" src={store.cover} width={480} />
      </span>
      <span className="lp-store__body">
        <span aria-hidden="true" className="lp-store__logo">
          {store.logoUrl ? <img alt="" height={56} loading="lazy" src={store.logoUrl} width={56} /> : initialsOf(store.name)}
        </span>
        <strong className="lp-store__name">{store.name}</strong>
        <span className="lp-store__meta">
          <span>
            <Package aria-hidden="true" size={14} /> {store.products} produit{store.products > 1 ? "s" : ""}
          </span>
          {store.city && (
            <span>
              <MapPin aria-hidden="true" size={14} /> {store.city}
            </span>
          )}
        </span>
      </span>
    </a>
  );
}

/**
 * « Ces boutiques vendent déjà avec PrestAfrik » : les 20 boutiques les plus visitées défilent sur une ligne
 * (pause au survol), puis le bouton vers la marketplace. Rien n'est affiché sans boutique.
 */
export async function Partners() {
  const stores = await loadShowcaseStores().catch(() => []);
  if (!stores.length) return null;

  return (
    <section aria-labelledby="partners-title" className="lp-partners">
      <h2 className="lp-partners__title" id="partners-title">
        {partners.title}
      </h2>
      <div className="lp-stores">
        {/* La liste est doublée pour que le défilement boucle sans saut ; la copie est ignorée des lecteurs d'écran. */}
        <ul className="lp-stores__track">
          {[...stores, ...stores].map((store, index) => (
            <li key={`${store.id}-${index}`}>
              <StoreMiniBanner hidden={index >= stores.length} store={store} />
            </li>
          ))}
        </ul>
      </div>
      <div className="lp-find-stores">
        <LandingButton href={shopUrl("/")}>
          {partners.findCta}
        </LandingButton>
      </div>
    </section>
  );
}
