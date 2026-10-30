import { BadgePercent, Crown, LayoutGrid, Rocket, Sparkles, Star, Store, Wallet, Zap } from "lucide-react";
import type { Metadata } from "next";
import { categoryIcon } from "@/components/shop/category-icons";
import { FeaturedStoreCard, ProductRail, ShopSectionHead, StoreTile } from "@/components/shop/shop-blocks";
import { ShopHero, type DrawnSlide } from "@/components/shop/shop-hero";
import { budgetHref, categoryHref, ShopShell, shopBudgets } from "@/components/shop/shop-shell";
import { FlashCountdown, ScrollRail } from "@/components/shop/shop-widgets";
import { shopUrl } from "@/lib/urls";
import { getShopAnnouncements } from "@/modules/announcements/queries";
import { getShopHome } from "@/modules/marketplace/shop";

export const metadata: Metadata = {
  title: { absolute: "PrestAfrik Shop : la marketplace des boutiques d’Afrique centrale" },
  description: "Mode, beauté, maison, alimentation… Ventes flash, promotions et produits les mieux notés des boutiques PrestAfrik. Commande sur WhatsApp, paiement à la livraison.",
  alternates: { canonical: shopUrl("/") },
};

export const dynamic = "force-dynamic";

const signupHref = () => `${(process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "")}/inscription`;

/**
 * Accueil de la marketplace (shop.prestafrik.com) : à la une, rubriques, ventes flash, promotions, budgets,
 * offres exclusives, mieux notés, boutiques à la une, univers, nouveautés et toutes les boutiques.
 * Une rubrique vide n'est pas affichée.
 */
export default async function ShopHomePage() {
  const [home, visuals] = await Promise.all([getShopHome(), getShopAnnouncements()]);
  const drawn: DrawnSlide[] = [
    {
      id: "bienvenue",
      kicker: "PrestAfrik Shop",
      title: "Les boutiques d’Afrique centrale, réunies ici",
      text: "Mode, beauté, maison, alimentation… Commandez directement aux vendeurs, payez à la livraison.",
      cta: "Découvrir les boutiques",
      href: shopUrl("/#boutiques"),
      tone: "navy",
      icon: "sparkles",
    },
    {
      id: "promos",
      kicker: "Bons plans",
      title: "Les promotions du moment",
      text: "Les plus belles réductions de nos vendeurs, mises à jour chaque jour.",
      cta: "Voir les promotions",
      href: shopUrl("/recherche?tri=promo&promo=1"),
      tone: "orange",
      icon: "zap",
    },
    {
      id: "vendre",
      kicker: "Vous êtes commerçant ?",
      title: "Votre boutique ici, gratuitement",
      text: "Prête en 5 minutes, visible sur la marketplace, commandes sur WhatsApp.",
      cta: "Ouvrir ma boutique",
      href: signupHref(),
      tone: "coral",
      icon: "rocket",
    },
  ];
  const drawnBanners: DrawnSlide[] = [
    { id: "livraison", kicker: "Zéro risque", title: "Paiement à la livraison", text: "Vous payez quand vous recevez.", cta: "Explorer les produits", href: shopUrl("/recherche"), tone: "navy", icon: "coins" },
    { id: "notes", kicker: "Avis vérifiés", title: "Les mieux notés", text: "Choisis par les acheteurs.", cta: "Voir", href: shopUrl("/recherche?tri=mieux-notes"), tone: "orange", icon: "sparkles" },
  ];

  return (
    <ShopShell categories={home.categories}>
      <ShopHero banners={visuals.banners} carousel={visuals.carousel} drawn={drawn} drawnBanners={drawnBanners} />

      {home.categories.length > 0 && (
        <section aria-labelledby="rubriques-title" className="shop-section" id="rubriques">
          <ShopSectionHead icon={LayoutGrid} id="rubriques-title" subtitle="Chaque univers a ses boutiques spécialisées." title="Trouvez ce qu’il vous faut" />
          <ul className="shop-categories">
            {home.categories.map((category) => {
              const { icon: Icon, tint } = categoryIcon(category.slug);
              return (
                <li key={category.slug}>
                  <a href={categoryHref(category.slug)} style={{ "--tint": tint } as React.CSSProperties}>
                    <span aria-hidden="true" className="shop-category-icon">
                      <Icon size={30} strokeWidth={1.7} />
                    </span>
                    <strong>{category.label}</strong>
                    <small>
                      {category.storeCount} boutique{category.storeCount > 1 ? "s" : ""}
                    </small>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {home.flash.products.length > 0 && (
        <section aria-labelledby="flash-title" className="shop-section shop-band shop-band--flash" id="ventes-flash">
          <ShopSectionHead
            aside={home.flash.endsAt ? <FlashCountdown endsAt={home.flash.endsAt.toISOString()} /> : undefined}
            icon={Zap}
            id="flash-title"
            subtitle="Quantités limitées, prix des vendeurs."
            title="Ventes flash"
          />
          <ProductRail label="Ventes flash" products={home.flash.products} variant="flash" />
        </section>
      )}

      {home.promotions.length > 0 && (
        <section aria-labelledby="promos-title" className="shop-section">
          <ShopSectionHead href={shopUrl("/recherche?tri=promo&promo=1")} icon={BadgePercent} id="promos-title" subtitle="Les plus fortes réductions d’abord." tint="#e8508a" title="Promotions du moment" />
          <ProductRail label="Promotions du moment" products={home.promotions} />
        </section>
      )}

      <section aria-labelledby="budget-title" className="shop-section">
        <ShopSectionHead icon={Wallet} id="budget-title" tint="#1f9d74" title="Votre budget, vos options" />
        <ul className="shop-budgets">
          {shopBudgets.map((budget) => (
            <li key={budget.label}>
              <a href={budgetHref(budget)}>{budget.label}</a>
            </li>
          ))}
        </ul>
      </section>

      {home.exclusive.length > 0 && (
        <section aria-labelledby="exclusives-title" className="shop-section shop-band shop-band--gold" id="offres-exclusives">
          <ShopSectionHead icon={Crown} id="exclusives-title" subtitle="Sélectionnées par l’équipe PrestAfrik, uniquement ici." title="Offres exclusives PrestAfrik" />
          <ProductRail label="Offres exclusives PrestAfrik" products={home.exclusive} variant="exclusive" />
        </section>
      )}

      {home.topRated.length > 0 && (
        <section aria-labelledby="notes-title" className="shop-section">
          <ShopSectionHead href={shopUrl("/recherche?tri=mieux-notes")} icon={Star} id="notes-title" subtitle="Notés par de vrais acheteurs." tint="#c8a12c" title="Les mieux notés" />
          <ProductRail label="Les mieux notés" products={home.topRated} />
        </section>
      )}

      {home.featuredStores.length > 0 && (
        <section aria-labelledby="une-title" className="shop-section">
          <ShopSectionHead icon={Sparkles} id="une-title" subtitle="Des vendeurs à découvrir absolument." title="Boutiques à la une" />
          <ScrollRail label="Boutiques à la une">
            {home.featuredStores.map((store) => (
              <li key={store.id}>
                <FeaturedStoreCard store={store} />
              </li>
            ))}
          </ScrollRail>
        </section>
      )}

      {home.niches.map(({ category, products }) => {
        const { icon, tint } = categoryIcon(category.slug);
        return (
          <section aria-labelledby={`univers-${category.slug}`} className="shop-section" key={category.slug}>
            <ShopSectionHead href={categoryHref(category.slug)} icon={icon} id={`univers-${category.slug}`} tint={tint} title={category.label} />
            <ProductRail label={category.label} products={products} />
          </section>
        );
      })}

      {home.newest.length > 0 && (
        <section aria-labelledby="nouveautes-title" className="shop-section">
          <ShopSectionHead href={shopUrl("/recherche?tri=nouveautes")} icon={Rocket} id="nouveautes-title" subtitle="Tout juste arrivés dans les boutiques." tint="#2f6bff" title="Nouveautés" />
          <ProductRail label="Nouveautés" products={home.newest} />
        </section>
      )}

      <section aria-labelledby="vendre-title" className="shop-section">
        <div className="shop-sell">
          <div>
            <p className="shop-sell-kicker">Vous êtes commerçant ?</p>
            <h2 id="vendre-title">Ouvrez votre boutique et vendez ici, gratuitement</h2>
            <p>Prête en 5 minutes. Vos produits apparaissent sur la marketplace, vos clients commandent sur WhatsApp.</p>
          </div>
          <a className="shop-sell-cta" href={signupHref()}>
            <Store aria-hidden="true" size={20} /> Créer ma boutique
          </a>
        </div>
      </section>

      <section aria-labelledby="boutiques-title" className="shop-section" id="boutiques">
        <ShopSectionHead icon={Store} id="boutiques-title" title="Toutes les boutiques" />
        {home.stores.length > 0 ? (
          <ul className="stores-tiles">
            {home.stores.map((store) => (
              <li key={store.id}>
                <StoreTile store={store} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="shop-empty">Les premières boutiques arrivent. Vous êtes vendeur ? La vôtre pourrait être la première.</p>
        )}
      </section>
    </ShopShell>
  );
}
