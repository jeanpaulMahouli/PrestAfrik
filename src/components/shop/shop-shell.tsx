import "@/styles/shop.css";
import "@/styles/shop-universes.css";
import "@/styles/shop-layout.css";
import "@/styles/shop-showcase.css";
import { Crown, Envelope, House, Lightning, Percent, Phone, RocketLaunch, Star, Storefront, Tag, Handshake, ForkKnife } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import Image from "next/image";
import type { ReactNode } from "react";
import { VendorSearch } from "@/components/marketplace/vendor-search";
import { site } from "@/config/site";
import { brandIdentity } from "@/lib/brand";
import { sellerLandingPath, shopUrl } from "@/lib/urls";
import { shopUniverses, type ShopUniverse } from "@/config/marketplace";
import { marketplaceAds, slotAd } from "@/config/marketplace-ads";
import { getShopAnnouncements } from "@/modules/announcements/queries";
import type { ShopScope } from "@/modules/marketplace/country";
import type { ShopCategory } from "@/modules/marketplace/shop";
import { CityPicker } from "./city-picker";
import { CartLink } from "./market-cart";
import { ShopAssistant } from "./shop-assistant";
import { MegaMenu, type MegaCategory } from "./shop-mega-menu";
import { ShopTicker, type TickerItem } from "./shop-ticker";
import { UniverseMenu, UniverseWelcome } from "./universe-switch";

/** Fenêtre d’accueil « Que recherchez-vous ? » à la première visite (désactivée pour le moment). */
const SHOW_UNIVERSE_WELCOME = false;

export const shopBudgets = [
  { label: "Moins de 5 000 FCFA", max: 5000 },
  { label: "Moins de 10 000 FCFA", max: 10000 },
  { label: "Moins de 25 000 FCFA", max: 25000 },
  { label: "Moins de 50 000 FCFA", max: 50000 },
  { label: "50 000 FCFA et plus", min: 50000 },
] as const;

export const budgetHref = (budget: (typeof shopBudgets)[number]) => shopUrl(`/recherche?${"max" in budget ? `max=${budget.max}` : `min=${budget.min}`}`);
export const categoryHref = (slug: string) => shopUrl(`/recherche?categorie=${slug}`);

const siteHref = (path: string) => `${(process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "")}${path}`;
/** « Devenir vendeur » : la page de présentation pour les vendeurs (prestafrik.com/boutique). */
const signupHref = () => sellerLandingPath;

type Rubrique = { id: string; href: string; label: string; icon: Icon };

/** Raccourcis de chaque univers, en vocabulaire courant. */
function rubriquesFor(universe: ShopUniverse): Rubrique[] {
  if (universe === "immobilier") {
    return [
      { id: "nouveautes", href: shopUrl("/recherche?tri=nouveautes"), label: "Nouvelles annonces", icon: RocketLaunch },
      { id: "promo", href: shopUrl("/recherche?tri=promo&promo=1"), label: "Bonnes affaires", icon: Tag },
      { id: "notes", href: shopUrl("/recherche?tri=mieux-notes"), label: "Annonceurs les mieux notés", icon: Star },
    ];
  }
  if (universe === "restauration") {
    return [
      { id: "nouveautes", href: shopUrl("/recherche?tri=nouveautes"), label: "Nouvelles adresses", icon: RocketLaunch },
      { id: "notes", href: shopUrl("/recherche?tri=mieux-notes"), label: "Les mieux notés", icon: Star },
      { id: "promo", href: shopUrl("/recherche?tri=promo&promo=1"), label: "Menus en promo", icon: Percent },
      { id: "petits-prix", href: shopUrl("/recherche?max=3000"), label: "Petits prix", icon: Tag },
    ];
  }
  if (universe === "services") {
    return [
      { id: "nouveautes", href: shopUrl("/recherche?tri=nouveautes"), label: "Nouveaux prestataires", icon: RocketLaunch },
      { id: "notes", href: shopUrl("/recherche?tri=mieux-notes"), label: "Les mieux notés", icon: Star },
      { id: "promo", href: shopUrl("/recherche?tri=promo&promo=1"), label: "Offres du moment", icon: Percent },
    ];
  }
  return [
    { id: "flash", href: shopUrl("/#ventes-flash"), label: "Offre du jour", icon: Lightning },
    { id: "promo", href: shopUrl("/recherche?tri=promo&promo=1"), label: "Promotions", icon: Percent },
    { id: "notes", href: shopUrl("/recherche?tri=mieux-notes"), label: "Meilleures ventes", icon: Star },
    { id: "petits-prix", href: shopUrl("/recherche?max=5000"), label: "Petits prix", icon: Tag },
    { id: "nouveautes", href: shopUrl("/recherche?tri=nouveautes"), label: "Nouveautés", icon: RocketLaunch },
    { id: "exclusif", href: shopUrl("/#offres-exclusives"), label: "Exclusivités", icon: Crown },
  ];
}

const ctaFor: Record<ShopUniverse, { label: string; icon: Icon }> = {
  vente: { label: "Devenir vendeur", icon: Storefront },
  immobilier: { label: "Publier une annonce", icon: House },
  services: { label: "Proposer mes services", icon: Handshake },
  restauration: { label: "Ouvrir mon restaurant", icon: ForkKnife },
};

/**
 * Cadre de la marketplace : bandeau publicitaire (textes qui défilent), en-tête blanc en verre (logo,
 * « Livrer à », recherche, univers, « Devenir vendeur »), barre de navigation (grand menu des catégories
 * et raccourcis), puis pied de page et assistant. En-tête et barre de navigation forment un seul bloc
 * collant en haut de l'écran. Première visite : fenêtre « Que recherchez-vous ? ».
 */
export async function ShopShell({
  categories,
  scope,
  ticker = [],
  tickerSeconds = 4,
  active,
  query,
  menu,
  children,
}: {
  categories: ShopCategory[];
  /** Produits de chaque catégorie pour le grand menu (sinon la liste seule). */
  menu?: Map<string, MegaCategory["products"]>;
  scope: ShopScope;
  /** Vrai si seules les boutiques de la ville du visiteur sont montrées. */
  local: boolean;
  /** Textes du bandeau publicitaire (Administration → Marketplace). */
  ticker?: TickerItem[];
  /** Durée d'affichage de chaque texte du bandeau, en secondes. */
  tickerSeconds?: number;
  active?: string;
  query?: string;
  children: ReactNode;
}) {
  const whatsappDigits = site.whatsapp?.replace(/\D/g, "");
  const whatsapp = whatsappDigits ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent("Bonjour PrestAfrik, j’ai une question sur la marketplace.")}` : null;
  const rubriques = rubriquesFor(scope.universe);
  const megaCategories: MegaCategory[] = categories.map((category) => ({ slug: category.slug, label: category.label, href: categoryHref(category.slug), count: category.productCount, products: menu?.get(category.slug)?.slice(0, 6) ?? [] }));
  const Cta = ctaFor[scope.universe].icon;
  const menuAd = slotAd((await getShopAnnouncements()).slots.menu, marketplaceAds.menu);
  // Bandeau publicitaire : textes de l'administration, sinon nos engagements.
  const tickerItems: TickerItem[] = ticker.length
    ? ticker
    : [
        { id: "livraison", text: "Paiement à la livraison partout au Cameroun", linkUrl: null },
        { id: "whatsapp", text: "Commandez sur WhatsApp : le vendeur vous répond vite", linkUrl: null },
        { id: "vendre", text: "Vendeur ? Votre boutique en ligne en 5 minutes", linkUrl: signupHref() },
      ];

  return (
    <div className="shop">
      <a className="shop-skip" href="#shop-contenu">
        Aller au contenu
      </a>
      {/* Espace publicitaire : un texte à la fois, en boucle (Administration → Marketplace). */}
      <div className="sx-adbar">
        <ShopTicker items={tickerItems} seconds={tickerSeconds} />
      </div>

      <div className="sx-sticky">
        <header className="shop-header">
          <div className="sx-wrap sx-header-row">
            <a aria-label="PrestAfrik, accueil de la marketplace" className="shop-logo" href={shopUrl("/")}>
              <Image alt="" height={40} priority src="/brand/logo-prestafrik.png" width={73} />
            </a>
            <CityPicker current={scope.city?.name ?? null} label={scope.universe === "vente" ? "Livrer à" : "Votre ville"} />
            <VendorSearch bare className="shop-search" defaultValue={query ?? ""} placeholder={scope.universe === "immobilier" ? "Appartement, studio meublé, bureau…" : scope.universe === "services" ? "Coiffure, réparation, transport…" : scope.universe === "restauration" ? "Restaurant, pizza, poulet DG, gâteau…" : "Rechercher un produit, une boutique…"} resultsPath={shopUrl("/recherche")} />
            <UniverseMenu current={scope.universe} home={shopUrl("/")} />
            <CartLink href={shopUrl("/panier")} />
            <a className="sx-btn sx-btn-primary shop-header-cta" data-emplacement="en-tete" href={signupHref()}>
              <Cta aria-hidden="true" size={20} />
              <span>{ctaFor[scope.universe].label}</span>
            </a>
          </div>
        </header>

        <nav aria-label="Raccourcis" className="shop-rubriques">
          <div className="sx-wrap sx-nav-row">
            <MegaMenu active={active} ad={menuAd} allHref={shopUrl("/recherche")} categories={megaCategories} />
            <ul className="sx-nav-links">
              {rubriques.map(({ id, href, label, icon: Icon }) => (
                <li key={id}>
                  <a aria-current={active === id ? "page" : undefined} className={`shop-rubrique shop-rubrique--${id}`} href={href}>
                    <Icon aria-hidden="true" size={20} /> {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
      {/* Fenêtre d’accueil « Que recherchez-vous ? » désactivée pour le moment : réactiver avec SHOW_UNIVERSE_WELCOME. */}
      {SHOW_UNIVERSE_WELCOME && !scope.chosen && <UniverseWelcome city={scope.city?.name ?? null} home={shopUrl("/")} />}

      <main className="shop-main" id="shop-contenu">
        {children}
      </main>

      <footer className="shop-footer">
        <div className="sx-wrap sx-footer-grid">
          <div className="shop-footer-brand">
            <Image alt="PrestAfrik" height={110} src="/brand/logo-white.webp" width={201} />
            <p>{brandIdentity} Paiement à la livraison.</p>
            <ul className="sx-footer-contacts">
              {site.phones.map((phone) => (
                <li key={phone}>
                  <a href={`tel:${phone.replace(/\s/g, "")}`}>
                    <Phone aria-hidden="true" size={18} /> {phone}
                  </a>
                </li>
              ))}
              <li>
                <a href={`mailto:${site.email}`}>
                  <Envelope aria-hidden="true" size={18} /> {site.email}
                </a>
              </li>
            </ul>
          </div>
          <nav aria-label="Catégories populaires">
            <h2>Catégories</h2>
            <ul>
              {categories.slice(0, 8).map((category) => (
                <li key={category.slug}>
                  <a href={categoryHref(category.slug)}>{category.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Acheter">
            <h2>{shopUniverses[scope.universe].short}</h2>
            <ul>
              {rubriques.map((item) => (
                <li key={item.id}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="PrestAfrik">
            <h2>PrestAfrik</h2>
            <ul>
              <li data-emplacement="pied-de-page">
                <a href={signupHref()}>Devenir vendeur</a>
              </li>
              <li>
                <a href={siteHref("/a-propos")}>À propos</a>
              </li>
              <li>
                <a href={siteHref("/aide")}>Centre d’aide</a>
              </li>
              <li>
                <a href={siteHref("/blog")}>Blog</a>
              </li>
              <li>
                <a href={siteHref("/contact")}>Contact</a>
              </li>
              <li>
                <a href={siteHref("/legal/conditions-generales")}>Conditions générales</a>
              </li>
              <li>
                <a href={siteHref("/legal/politique-de-confidentialite")}>Confidentialité</a>
              </li>
            </ul>
          </nav>
          <nav aria-label="Recherches fréquentes" className="sx-footer-tags">
            <h2>Recherches fréquentes</h2>
            <ul>
              {shopBudgets.slice(0, 3).map((budget) => (
                <li key={budget.label}>
                  <a href={budgetHref(budget)}>{budget.label}</a>
                </li>
              ))}
              {categories.slice(0, 7).map((category) => (
                <li key={category.slug}>
                  <a href={categoryHref(category.slug)}>{category.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="shop-footer-copy">© {new Date().getFullYear()} PrestAfrik. Les produits sont vendus par les boutiques, qui en sont responsables.</p>
      </footer>

      <ShopAssistant
        budgets={shopBudgets.map((budget) => ({ label: budget.label, href: budgetHref(budget) }))}
        categories={categories.map((category) => ({ label: category.label, href: categoryHref(category.slug) }))}
        searchHref={shopUrl("/recherche")}
        signupHref={signupHref()}
        whatsapp={whatsapp}
      />
    </div>
  );
}
