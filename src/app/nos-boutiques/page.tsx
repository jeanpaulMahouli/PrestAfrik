import { BadgePercent, Building2, Crown, Flame, Handshake, Rocket, Sparkles, Star, Tag, Wallet, Zap } from "lucide-react";
import type { Metadata } from "next";
import { categoryIcon } from "@/components/shop/category-icons";
import { FeaturedStoreCard, ProductRail, ShopSectionHead } from "@/components/shop/shop-blocks";
import { ShopHero, ShopSingleBanner, type DrawnSlide } from "@/components/shop/shop-hero";
import { BudgetSelect } from "@/components/shop/shop-menus";
import { budgetHref, categoryHref, ShopShell, shopBudgets } from "@/components/shop/shop-shell";
import { FlashCountdown, ScrollRail } from "@/components/shop/shop-widgets";
import { shopUniverses } from "@/config/marketplace";
import { brandStructuredData } from "@/lib/brand";
import { jsonLd, sharePreviewImage } from "@/lib/seo";
import { sellerLandingPath, shopUrl } from "@/lib/urls";
import { getShopAnnouncements, getShopTicker, getShopTickerSeconds } from "@/modules/announcements/queries";
import { getShopScope } from "@/modules/marketplace/country";
import { getShopHome } from "@/modules/marketplace/shop";

// Accueil de prestafrik.com : la page de la marque. Le titre commence par « PrestAfrik » : c'est lui que
// Google montre (et compare) quand on cherche « PrestAfrik ».
export const metadata: Metadata = {
  title: { absolute: "PrestAfrik – La marketplace du Cameroun : achetez aux vendeurs sur WhatsApp" },
  description: "PrestAfrik, la marketplace du Cameroun : mode, beauté, téléphones, maison… Contactez directement le vendeur sur WhatsApp et payez à la livraison.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "PrestAfrik",
    locale: "fr_CM",
    title: "PrestAfrik – La marketplace du Cameroun",
    description: "Tout le marché dans votre téléphone : trouvez un produit, écrivez au vendeur sur WhatsApp, payez à la livraison.",
    images: [sharePreviewImage],
  },
};

export const dynamic = "force-dynamic";

/** « Devenir vendeur », « Publier une annonce », « Proposer mes services » : la page de présentation pour les vendeurs. */
const signupHref = () => sellerLandingPath;

/**
 * Accueil de la marketplace (shop.prestafrik.com), pour l'univers choisi (shopping, immobilier, services) et
 * la ville du visiteur : bannières (images et boutons), raccourcis, budget, catégories en cercles, offre du
 * jour, incontournables, exclusivités, une section par catégorie, puis les boutiques à la une.
 * Une section vide n'est pas affichée.
 */
export default async function ShopHomePage() {
  const scope = await getShopScope();
  const [home, visuals, ticker, tickerSeconds] = await Promise.all([getShopHome(scope), getShopAnnouncements(), getShopTicker(), getShopTickerSeconds()]);
  const universe = scope.universe;

  // Emplacements sans image : le bouton seul, sur un fond aux couleurs de PrestAfrik.
  const drawn: DrawnSlide[] =
    universe === "immobilier"
      ? [
          { id: "immo", cta: "Voir les annonces", href: shopUrl("/recherche?tri=nouveautes"), tone: "navy" },
          { id: "publier", cta: "Publier une annonce", href: signupHref(), tone: "coral" },
        ]
      : universe === "services"
        ? [
            { id: "services", cta: "Trouver un prestataire", href: shopUrl("/recherche?tri=mieux-notes"), tone: "navy" },
            { id: "proposer", cta: "Proposer mes services", href: signupHref(), tone: "coral" },
          ]
        : [
            { id: "bienvenue", cta: "Découvrir les boutiques", href: shopUrl("/#boutiques"), tone: "navy" },
            { id: "promos", cta: "Voir les promotions", href: shopUrl("/recherche?tri=promo&promo=1"), tone: "orange" },
            { id: "vendre", cta: "Ouvrir ma boutique", href: signupHref(), tone: "coral" },
          ];
  const drawnBanners: DrawnSlide[] = [
    { id: "explorer", cta: "Explorer", href: shopUrl("/recherche"), tone: "navy" },
    { id: "notes", cta: "Les mieux notés", href: shopUrl("/recherche?tri=mieux-notes"), tone: "orange" },
  ];

  // Raccourcis illustrés (icône, deux mots).
  const shortcuts =
    universe === "vente"
      ? [
          { label: "Offre du jour", href: shopUrl("/#ventes-flash"), icon: Zap, tint: "#ff6a00" },
          { label: "Promotions", href: shopUrl("/recherche?tri=promo&promo=1"), icon: BadgePercent, tint: "#e8508a" },
          { label: "Meilleures ventes", href: shopUrl("/recherche?tri=mieux-notes"), icon: Star, tint: "#c8a12c" },
          { label: "Petits prix", href: shopUrl("/recherche?max=5000"), icon: Tag, tint: "#1f9d74" },
          { label: "Nouveautés", href: shopUrl("/recherche?tri=nouveautes"), icon: Rocket, tint: "#2f6bff" },
          { label: "Exclusivités", href: shopUrl("/#offres-exclusives"), icon: Crown, tint: "#7c5cff" },
        ]
      : [
          { label: universe === "immobilier" ? "Nouvelles annonces" : "Nouveaux prestataires", href: shopUrl("/recherche?tri=nouveautes"), icon: Rocket, tint: "#2f6bff" },
          { label: "Les mieux notés", href: shopUrl("/recherche?tri=mieux-notes"), icon: Star, tint: "#c8a12c" },
          { label: universe === "immobilier" ? "Bonnes affaires" : "Offres du moment", href: shopUrl("/recherche?tri=promo&promo=1"), icon: BadgePercent, tint: "#e8508a" },
          { label: "Petits budgets", href: shopUrl("/recherche?max=50000"), icon: Tag, tint: "#1f9d74" },
        ];
  const budgets = shopBudgets.map((budget) => ({ label: budget.label, href: budgetHref(budget) }));
  const empty = universe !== "vente" && home.categories.length === 0;
  const EmptyIcon = universe === "immobilier" ? Building2 : Handshake;

  return (
    <ShopShell categories={home.categories} local={home.local} scope={scope} ticker={ticker} tickerSeconds={tickerSeconds}>
      {/* Fiche d'identité de la marque : sur l'accueil seulement. */}
      <script dangerouslySetInnerHTML={jsonLd(brandStructuredData())} type="application/ld+json" />
      {/* Titre unique de la page, lu par Google et les lecteurs d'écran ; la bannière « Devenir vendeur » suit. */}
      <h1 className="visually-hidden">PrestAfrik, la marketplace du Cameroun : achetez directement aux vendeurs, sur WhatsApp</h1>
      {universe === "vente" ? (
        <ShopHero banners={visuals.banners} carousel={visuals.carousel} drawn={drawn} drawnBanners={drawnBanners} sellerHref={sellerLandingPath} />
      ) : (
        <ShopSingleBanner banner={universe === "immobilier" ? visuals.immo : visuals.services} fallback={drawn[0]} />
      )}

      <nav aria-label="Raccourcis" className="shop-shortcuts">
        <ul style={{ "--count": shortcuts.length } as React.CSSProperties}>
          {shortcuts.map(({ label, href, icon: Icon, tint }) => (
            <li key={label}>
              <a href={href} style={{ "--tint": tint } as React.CSSProperties}>
                <span aria-hidden="true">
                  <Icon size={22} strokeWidth={1.9} />
                </span>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {empty && (
        <section className="shop-universe-empty">
          <span aria-hidden="true">
            <EmptyIcon size={40} strokeWidth={1.6} />
          </span>
          <h2>{universe === "immobilier" ? "Les premières annonces arrivent" : "Les premiers prestataires arrivent"}</h2>
          <p>{universe === "immobilier" ? "Propriétaire ou agence ? Publiez vos biens en quelques minutes, les demandes arrivent sur WhatsApp." : "Coiffeur, artisan, traiteur, transporteur ? Votre vitrine est prête en 5 minutes."}</p>
          <a className="shop-btn shop-btn-primary" href={signupHref()}>
            {universe === "immobilier" ? "Publier une annonce" : "Proposer mes services"}
          </a>
          <p className="shop-universe-switch">En attendant, découvrez « {shopUniverses.vente.label} » en haut de la page.</p>
        </section>
      )}

      {!empty && (
        <section aria-labelledby="budget-title" className="shop-section shop-budget-row">
          <ShopSectionHead icon={Wallet} id="budget-title" title="Votre budget" />
          <ul className="shop-budgets">
            {budgets.map((budget) => (
              <li key={budget.label}>
                <a href={budget.href}>{budget.label}</a>
              </li>
            ))}
          </ul>
          <BudgetSelect budgets={budgets} />
        </section>
      )}

      {home.categories.length > 0 && (
        <section aria-label="Catégories" className="shop-section" id="rubriques">
          <ul className="shop-categories">
            {home.categories.map((category) => {
              const { icon: Icon, tint } = categoryIcon(category.slug);
              return (
                <li key={category.slug}>
                  <a href={categoryHref(category.slug)} style={{ "--tint": tint } as React.CSSProperties}>
                    <span aria-hidden="true" className="shop-category-circle">
                      {/* Image ronde de l'administration ; à défaut, l'icône de la catégorie. */}
                      {category.imageUrl ? <img alt="" decoding="async" loading="lazy" src={category.imageUrl} /> : <Icon size={30} strokeWidth={1.7} />}
                    </span>
                    <strong>{category.label}</strong>
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
            subtitle="Stock limité, prix des vendeurs."
            title="Offre du jour"
          />
          <ProductRail label="Offre du jour" products={home.flash.products} variant="flash" />
        </section>
      )}

      {home.topProducts.length > 0 && (
        <section aria-labelledby="incontournables-title" className="shop-section" id="incontournables">
          <ShopSectionHead href={shopUrl("/recherche?tri=mieux-notes")} icon={Flame} id="incontournables-title" moreLabel="Découvrir" title="Les incontournables du moment" />
          <ProductRail label="Les incontournables du moment" products={home.topProducts} />
        </section>
      )}

      {home.exclusive.length > 0 && (
        <section aria-labelledby="exclusives-title" className="shop-section shop-band shop-band--gold" id="offres-exclusives">
          <ShopSectionHead icon={Crown} id="exclusives-title" subtitle="Uniquement sur PrestAfrik Shop." title="Exclusivités PrestAfrik" />
          <ProductRail label="Exclusivités PrestAfrik" products={home.exclusive} variant="exclusive" />
        </section>
      )}

      {/* Une section par catégorie : « Vêtements et mode (3) », le nombre de boutiques entre parenthèses. */}
      {home.sections.map(({ category, products }) => (
        <section aria-labelledby={`categorie-${category.slug}`} className="shop-section shop-category-section" key={category.slug} style={{ "--tint": categoryIcon(category.slug).tint } as React.CSSProperties}>
          <ShopSectionHead
            href={categoryHref(category.slug)}
            id={`categorie-${category.slug}`}
            title={
              <>
                {category.label} <span className="shop-section-count">({category.storeCount})</span>
              </>
            }
          />
          <ProductRail label={category.label} products={products} />
        </section>
      ))}

      {home.featuredStores.length > 0 ? (
        <section aria-labelledby="une-title" className="shop-section" id="boutiques">
          <ShopSectionHead icon={Sparkles} id="une-title" title={universe === "immobilier" ? "Annonceurs à la une" : universe === "services" ? "Prestataires à la une" : "Boutiques à la une"} />
          <ScrollRail label="Boutiques à la une">
            {home.featuredStores.map((store) => (
              <li key={store.id}>
                <FeaturedStoreCard store={store} />
              </li>
            ))}
          </ScrollRail>
        </section>
      ) : (
        universe === "vente" && <p className="shop-empty">Les premières boutiques arrivent. Vous êtes vendeur ? La vôtre pourrait être la première.</p>
      )}
    </ShopShell>
  );
}
