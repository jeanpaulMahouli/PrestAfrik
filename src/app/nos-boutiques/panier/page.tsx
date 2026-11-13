import { House } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { MarketCart } from "@/components/shop/market-cart";
import { ShopShell } from "@/components/shop/shop-shell";
import { shopUrl } from "@/lib/urls";
import { getShopTicker, getShopTickerSeconds } from "@/modules/announcements/queries";
import { getShopScope } from "@/modules/marketplace/country";
import { getShopHome } from "@/modules/marketplace/shop";

export const metadata: Metadata = { title: { absolute: "Mon panier | PrestAfrik" }, robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

/** Panier de la marketplace : les produits ajoutés, rangés par boutique, à commander sans quitter PrestAfrik. */
export default async function MarketCartPage() {
  const scope = await getShopScope();
  const [home, ticker, tickerSeconds] = await Promise.all([getShopHome(scope), getShopTicker(), getShopTickerSeconds()]);
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
            <span aria-current="page">Panier</span>
          </li>
        </ol>
      </nav>
      <div className="sx-wrap sx-page">
        <h1 className="sx-page-title">Mon panier</h1>
        <MarketCart checkoutPath={shopUrl("/commande")} homeHref={shopUrl("/")} />
      </div>
    </ShopShell>
  );
}
