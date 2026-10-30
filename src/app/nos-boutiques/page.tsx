import { Crown, LayoutGrid, Sparkles, Store, Wallet, Zap } from "lucide-react";
import type { Metadata } from "next";
import { categoryIcon } from "@/components/shop/category-icons";
import { FeaturedStoreCard, ProductRail, ShopSectionHead } from "@/components/shop/shop-blocks";
import { ShopHero, type DrawnSlide } from "@/components/shop/shop-hero";
import { budgetHref, categoryHref, ShopShell, shopBudgets } from "@/components/shop/shop-shell";
import { FlashCountdown, ScrollRail } from "@/components/shop/shop-widgets";
import { shopUrl } from "@/lib/urls";
import { getShopAnnouncements } from "@/modules/announcements/queries";
import { getShopCountry } from "@/modules/marketplace/country";
import { getShopHome } from "@/modules/marketplace/shop";

export const metadata: Metadata = {
  title: { absolute: "PrestAfrik Shop : la marketplace des boutiques d’Afrique centrale" },
  description: "Mode, beauté, maison, alimentation… Ventes flash, promotions et produits les mieux notés des boutiques PrestAfrik. Commande sur WhatsApp, paiement à la livraison.",
  alternates: { canonical: shopUrl("/") },
};

export const dynamic = "force-dynamic";

const signupHref = () => `${(process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "")}/inscription`;

/**
 * Accueil de la marketplace (shop.prestafrik.com) : à la une, budgets, catégories, ventes flash, offres
 * exclusives, une section par grande catégorie, puis les boutiques à la une. Les boutiques montrées sont
 * celles du pays du visiteur (zone CEMAC). Une section vide n'est pas affichée.
 */
export default async function ShopHomePage() {
  const country = await getShopCountry();
  const [home, visuals] = await Promise.all([getShopHome(country?.iso), getShopAnnouncements()]);
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
    <ShopShell categories={home.categories} country={country} local={home.local}>
      <ShopHero banners={visuals.banners} carousel={visuals.carousel} drawn={drawn} drawnBanners={drawnBanners} />

      <section aria-labelledby="budget-title" className="shop-section">
        <ShopSectionHead icon={Wallet} id="budget-title" title="Votre budget, vos options" />
        <ul className="shop-budgets">
          {shopBudgets.map((budget) => (
            <li key={budget.label}>
              <a href={budgetHref(budget)}>{budget.label}</a>
            </li>
          ))}
        </ul>
      </section>

      {home.categories.length > 0 && (
        <section aria-labelledby="rubriques-title" className="shop-section" id="rubriques">
          <ShopSectionHead icon={LayoutGrid} id="rubriques-title" subtitle={home.local && country ? `Les boutiques ${country.locative}, par univers.` : "Chaque univers a ses boutiques spécialisées."} title="Trouvez ce qu’il vous faut" />
          <ul className="shop-categories">
            {home.categories.map((category) => {
              const { icon: Icon, tint } = categoryIcon(category.slug);
              return (
                <li key={category.slug}>
                  <a href={categoryHref(category.slug)} style={{ "--tint": tint } as React.CSSProperties}>
                    <Icon aria-hidden="true" className="shop-category-icon" size={30} strokeWidth={1.7} />
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

      {home.exclusive.length > 0 && (
        <section aria-labelledby="exclusives-title" className="shop-section shop-band shop-band--gold" id="offres-exclusives">
          <ShopSectionHead icon={Crown} id="exclusives-title" subtitle="Sélectionnées par l’équipe PrestAfrik, uniquement ici." title="Offres exclusives PrestAfrik" />
          <ProductRail label="Offres exclusives PrestAfrik" products={home.exclusive} variant="exclusive" />
        </section>
      )}

      {/* Une section par grande catégorie : les produits ne sont jamais mélangés entre catégories. */}
      {home.sections.map(({ category, products }) => {
        const { icon, tint } = categoryIcon(category.slug);
        return (
          <section aria-labelledby={`categorie-${category.slug}`} className="shop-section shop-category-section" key={category.slug} style={{ "--tint": tint } as React.CSSProperties}>
            <ShopSectionHead
              href={categoryHref(category.slug)}
              icon={icon}
              id={`categorie-${category.slug}`}
              subtitle={`${category.storeCount} boutique${category.storeCount > 1 ? "s" : ""} · promotions et mieux notés d’abord`}
              tint={tint}
              title={category.label}
            />
            <ProductRail label={category.label} products={products} />
          </section>
        );
      })}

      <section aria-labelledby="vendre-title" className="shop-section">
        <div className="shop-sell">
          <div>
            <p className="shop-sell-kicker">Vous êtes commerçant ?</p>
            <h2 id="vendre-title">Ouvrez votre boutique et vendez ici, gratuitement</h2>
            <p>Prête en 5 minutes. Vos produits apparaissent sur la marketplace, vos clients commandent sur WhatsApp.</p>
          </div>
          <a className="shop-btn shop-btn-dark" href={signupHref()}>
            <Store aria-hidden="true" size={20} /> Créer ma boutique
          </a>
        </div>
      </section>

      {home.featuredStores.length > 0 ? (
        <section aria-labelledby="une-title" className="shop-section" id="boutiques">
          <ShopSectionHead icon={Sparkles} id="une-title" subtitle="Des vendeurs à découvrir absolument." title="Boutiques à la une" />
          <ScrollRail label="Boutiques à la une">
            {home.featuredStores.map((store) => (
              <li key={store.id}>
                <FeaturedStoreCard store={store} />
              </li>
            ))}
          </ScrollRail>
        </section>
      ) : (
        <p className="shop-empty">Les premières boutiques arrivent. Vous êtes vendeur ? La vôtre pourrait être la première.</p>
      )}
    </ShopShell>
  );
}
