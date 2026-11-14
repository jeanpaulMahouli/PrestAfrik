import { ArrowRight, Buildings, ForkKnife, Handshake } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { ProductRail } from "@/components/shop/shop-blocks";
import { ShopSingleBanner } from "@/components/shop/shop-hero";
import { categoryHref, ShopShell } from "@/components/shop/shop-shell";
import { announcementAd, BannerDuo, CategoryTiles, DealsBoard, MiniLists, ShowcaseHead, ShowcaseHero, shoppingPromises, TabbedShowcase, TrustStrip, WideBanner } from "@/components/shop/shop-showcase";
import { FlashCountdown } from "@/components/shop/shop-widgets";
import { UniverseSwitchButton } from "@/components/shop/universe-switch";
import { shopUniverses } from "@/config/marketplace";
import { marketplaceAds, slotAd } from "@/config/marketplace-ads";
import { brandStructuredData } from "@/lib/brand";
import { jsonLd, sharePreviewImage } from "@/lib/seo";
import { sellerLandingPath, shopUrl } from "@/lib/urls";
import { getShopAnnouncements, getShopTicker, getShopTickerSeconds } from "@/modules/announcements/queries";
import { getShopScope } from "@/modules/marketplace/country";
import { getShopHome, type ShopProduct } from "@/modules/marketplace/shop";

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

const chunk = <T,>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));

/**
 * Accueil de la marketplace, d'après la maquette : héros, garanties, bonnes affaires (ou offre du jour de
 * l'administration), catégories, produits à onglets avec colonnes publicitaires et bannières, exclusivités,
 * mini-listes, bande « Club ». Un bloc sans contenu n'est pas affiché.
 */
export default async function ShopHomePage() {
  const scope = await getShopScope();
  const [home, visuals, ticker, tickerSeconds] = await Promise.all([getShopHome(scope), getShopAnnouncements(), getShopTicker(), getShopTickerSeconds()]);
  const universe = scope.universe;
  // Vitrines : les prix symboliques (0 ou 1 FCFA) sont écartés.
  const priced = (products: ShopProduct[]) => products.filter((product) => product.priceXaf >= 100);
  const sections = home.sections.map((section) => ({ ...section, products: priced(section.products) })).filter((section) => section.products.length > 0);

  // Héros : visuels de l'administration, sinon les visuels provisoires (config/marketplace-ads.ts).
  const heroSlides = visuals.carousel.length ? visuals.carousel.map((item) => ({ id: item.id, ...announcementAd(item, marketplaceAds.hero.href) })) : [{ id: "provisoire", ...marketplaceAds.hero }];
  const heroSide = visuals.banners[0] ? announcementAd(visuals.banners[0], marketplaceAds.heroSide.href) : marketplaceAds.heroSide;

  // Bonnes affaires : l'offre du jour de l'administration, sinon les vraies promotions des vendeurs.
  const flash = home.flash.products.length > 0;
  const deals = priced(home.deals).filter((product) => product.id !== home.dealLead?.id);
  const dealProducts = flash ? home.flash.products : [...(home.dealLead ? [home.dealLead] : []), ...deals].slice(0, 9);

  const menu = new Map(sections.map(({ category, products }) => [category.slug, products]));
  const blocks = chunk(sections, 4);

  const empty = universe !== "vente" && home.categories.length === 0;
  const EmptyIcon = universe === "immobilier" ? Buildings : universe === "restauration" ? ForkKnife : Handshake;
  const sellerLabel = universe === "immobilier" ? "Publier une annonce" : universe === "services" ? "Proposer mes services" : universe === "restauration" ? "Ouvrir mon restaurant" : "Ouvrir ma boutique";
  const emptyTitle = universe === "immobilier" ? "Les premières locations arrivent" : universe === "restauration" ? "Les premiers restaurants arrivent" : "Les premiers prestataires arrivent";
  const emptyText =
    universe === "immobilier"
      ? "Propriétaire ou agence ? Publiez vos logements à louer et vos meublés en quelques minutes : les demandes de visite et de réservation arrivent sur votre WhatsApp."
      : universe === "restauration"
        ? "Restaurant, fast-food, traiteur ou pâtisserie ? Votre menu en ligne est prêt en 5 minutes : les commandes arrivent directement sur votre WhatsApp."
        : "Coiffeur, artisan, transporteur, photographe ? Votre vitrine est prête en 5 minutes : les demandes arrivent directement sur votre WhatsApp.";

  return (
    <ShopShell categories={home.categories} local={home.local} menu={menu} scope={scope} ticker={ticker} tickerSeconds={tickerSeconds}>
      {/* Fiche d'identité de la marque : sur l'accueil seulement. */}
      <script dangerouslySetInnerHTML={jsonLd(brandStructuredData())} type="application/ld+json" />
      {/* Titre unique de la page, lu par Google et les lecteurs d'écran ; la vitrine suit. */}
      <h1 className="visually-hidden">PrestAfrik, la marketplace du Cameroun : achetez directement aux vendeurs, sur WhatsApp</h1>
      <div className="sx-wrap sx-stack">
        {universe === "vente" ? (
          <ShowcaseHero sellerHref={sellerLandingPath} sellerImage={visuals.slots.seller} side={heroSide} slides={heroSlides} />
        ) : (
          <ShopSingleBanner banner={universe === "immobilier" ? visuals.immo : universe === "restauration" ? visuals.restauration : visuals.services} />
        )}

        {empty && (
          <section aria-labelledby="univers-vide-title" className="sx-empty-universe">
            <div className="sx-empty-universe-head">
              <span aria-hidden="true" className="sx-empty-universe-icon">
                <EmptyIcon size={30} />
              </span>
              <div>
                <p className="sx-empty-universe-kicker">{shopUniverses[universe].label}</p>
                <h2 id="univers-vide-title">{emptyTitle}</h2>
              </div>
            </div>
            <p className="sx-empty-universe-text">
              {emptyText}
            </p>
            <div className="sx-empty-universe-actions">
              <a className="sx-btn sx-btn-primary" href={signupHref()}>
                {sellerLabel}
                <ArrowRight aria-hidden="true" size={18} />
              </a>
              <UniverseSwitchButton className="sx-btn sx-btn-outline" home={shopUrl("/")} to="vente">
                En attendant, voir le {shopUniverses.vente.label}
              </UniverseSwitchButton>
            </div>
          </section>
        )}

        <TrustStrip items={shoppingPromises} />

        <DealsBoard
          aside={flash && home.flash.endsAt ? <FlashCountdown endsAt={home.flash.endsAt.toISOString()} /> : <span className="sx-chip">Prix fixés par les vendeurs</span>}
          href={shopUrl("/recherche?tri=promo&promo=1")}
          id="affaires-title"
          products={dealProducts}
          title={flash ? "Offre du jour" : "Les bonnes affaires"}
        />

        <CategoryTiles categories={home.categories} hrefFor={categoryHref} />

        {blocks.map((block, index) => (
          <div className="sx-stack" key={block.map((section) => section.category.slug).join("-")}>
            <TabbedShowcase
              ads={index % 2 === 0 ? [slotAd(visuals.slots.featuredColumn, marketplaceAds.featuredColumn)] : [slotAd(visuals.slots.columnTop, marketplaceAds.columnTop), slotAd(visuals.slots.columnBottom, marketplaceAds.columnBottom)]}
              allHref={shopUrl("/recherche")}
              hrefFor={categoryHref}
              id={`phares-${index}`}
              sections={block}
              side={index % 2 === 0 ? "left" : "right"}
              title={index === 0 ? (universe === "vente" ? "Produits phares" : "À la une") : "Encore plus de choix"}
            />
            {index === 0 && <BannerDuo ads={[slotAd(visuals.slots.duo[0], marketplaceAds.duoLeft), slotAd(visuals.slots.duo[1], marketplaceAds.duoRight)]} />}
          </div>
        ))}

        {home.exclusive.length > 0 && (
          <section aria-labelledby="exclusives-title" className="shop-section sx-section" id="offres-exclusives">
            <ShowcaseHead aside={<span className="sx-chip">Uniquement sur PrestAfrik</span>} id="exclusives-title" title="Exclusivités PrestAfrik" />
            <ProductRail label="Exclusivités PrestAfrik" products={home.exclusive} variant="exclusive" />
          </section>
        )}

        <WideBanner ad={slotAd(visuals.slots.wide, marketplaceAds.wide)} />

        <MiniLists
          lists={[
            { id: "affaires", title: "Bonnes affaires", href: shopUrl("/recherche?tri=promo&promo=1"), products: priced(home.deals) },
            { id: "notes", title: "Les mieux notés", href: shopUrl("/recherche?tri=mieux-notes"), products: priced(home.topProducts) },
            { id: "nouveautes", title: "Nouveautés", href: shopUrl("/recherche?tri=nouveautes"), products: priced(home.newest) },
            { id: "petits-prix", title: "Petits prix", href: shopUrl("/recherche?tri=prix-croissant"), products: priced(home.smallPrices) },
          ]}
        />
      </div>
    </ShopShell>
  );
}
