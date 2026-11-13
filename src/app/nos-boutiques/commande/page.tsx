import { House } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketCheckout } from "@/components/shop/market-cart";
import { ShopShell } from "@/components/shop/shop-shell";
import { shopUrl, storePublicUrl } from "@/lib/urls";
import { getShopTicker, getShopTickerSeconds } from "@/modules/announcements/queries";
import { getStorefrontStore } from "@/modules/catalog/service";
import { getShopScope } from "@/modules/marketplace/country";
import { getShopHome, marketplaceStore } from "@/modules/marketplace/shop";
import { getStorefrontExtras } from "@/modules/storefront/data";

export const metadata: Metadata = { title: { absolute: "Finaliser ma commande | PrestAfrik" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Commande sur la marketplace, pour une boutique (?boutique={adresse}) : informations, livraison ou
 * retrait, récapitulatif. La commande est créée chez la boutique, comme depuis sa vitrine.
 */
export default async function MarketCheckoutPage({ searchParams }: PageProps<"/nos-boutiques/commande">) {
  const slug = (await searchParams).boutique;
  if (typeof slug !== "string") notFound();
  const listed = await marketplaceStore(slug);
  const store = listed ? await getStorefrontStore(slug) : null;
  if (!listed || !store || store.isPreview || store.subscriptionPaused) notFound();
  const scope = await getShopScope();
  const [extras, home, ticker, tickerSeconds] = await Promise.all([getStorefrontExtras(store.id), getShopHome(scope), getShopTicker(), getShopTickerSeconds()]);
  const storeUrl = storePublicUrl(store.slug);
  return (
    <ShopShell categories={home.categories} local={home.local} menu={new Map(home.sections.map(({ category, products }) => [category.slug, products]))} scope={scope} ticker={ticker} tickerSeconds={tickerSeconds}>
      <nav aria-label="Fil d’Ariane" className="sx-crumbs">
        <ol className="sx-wrap">
          <li>
            <a href={shopUrl("/")}>
              <House aria-hidden="true" size={20} /> Accueil
            </a>
          </li>
          <li>
            <a href={shopUrl("/panier")}>Panier</a>
          </li>
          <li>
            <span aria-current="page">Commande chez {store.name}</span>
          </li>
        </ol>
      </nav>
      <div className="sx-wrap sx-page">
        <h1 className="sx-page-title">Finaliser ma commande chez {store.name}</h1>
        <MarketCheckout
          cartHref={shopUrl("/panier")}
          homeHref={shopUrl("/")}
          pickup={{ enabled: extras.store.pickupEnabled, address: extras.store.pickupAddress ?? extras.store.address, hours: extras.store.pickupHours }}
          store={{ id: store.id, slug: store.slug, name: store.name, logoUrl: listed.logoUrl }}
          trackingBase={`${storeUrl}/suivi`}
          zones={extras.zones}
        />
      </div>
    </ShopShell>
  );
}
