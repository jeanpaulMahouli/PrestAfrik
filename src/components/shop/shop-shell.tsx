import "@/styles/shop.css";
import "@/styles/shop-universes.css";
import "@/styles/shop-layout.css";
import { BadgeCheck, BadgePercent, CalendarCheck, Crown, HandCoins, Handshake, House, KeyRound, LayoutGrid, MapPinned, Rocket, ShieldCheck, Star, Store, Tag, Zap, type LucideIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { VendorSearch } from "@/components/marketplace/vendor-search";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { site } from "@/config/site";
import { brandIdentity } from "@/lib/brand";
import { sellerLandingPath, shopUrl } from "@/lib/urls";
import { shopUniverses, type ShopUniverse } from "@/config/marketplace";
import type { ShopScope } from "@/modules/marketplace/country";
import type { ShopCategory } from "@/modules/marketplace/shop";
import { CityPicker } from "./city-picker";
import { ShopAssistant } from "./shop-assistant";
import { CategoryMenu } from "./shop-menus";
import { ShopTicker, type TickerItem } from "./shop-ticker";
import { UniverseTabs, UniverseWelcome } from "./universe-switch";

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

type Rubrique = { id: string; href: string; label: string; icon: LucideIcon };

/** Raccourcis de chaque univers, en vocabulaire courant. */
function rubriquesFor(universe: ShopUniverse): Rubrique[] {
  const home = { id: "toutes", href: shopUrl("/"), label: "Accueil", icon: LayoutGrid };
  if (universe === "immobilier") {
    return [
      home,
      { id: "nouveautes", href: shopUrl("/recherche?tri=nouveautes"), label: "Nouvelles annonces", icon: Rocket },
      { id: "promo", href: shopUrl("/recherche?tri=promo&promo=1"), label: "Bonnes affaires", icon: Tag },
      { id: "notes", href: shopUrl("/recherche?tri=mieux-notes"), label: "Annonceurs les mieux notés", icon: Star },
    ];
  }
  if (universe === "services") {
    return [
      home,
      { id: "nouveautes", href: shopUrl("/recherche?tri=nouveautes"), label: "Nouveaux prestataires", icon: Rocket },
      { id: "notes", href: shopUrl("/recherche?tri=mieux-notes"), label: "Les mieux notés", icon: Star },
      { id: "promo", href: shopUrl("/recherche?tri=promo&promo=1"), label: "Offres du moment", icon: BadgePercent },
    ];
  }
  return [
    home,
    { id: "flash", href: shopUrl("/#ventes-flash"), label: "Offre du jour", icon: Zap },
    { id: "promo", href: shopUrl("/recherche?tri=promo&promo=1"), label: "Promotions", icon: BadgePercent },
    { id: "notes", href: shopUrl("/recherche?tri=mieux-notes"), label: "Meilleures ventes", icon: Star },
    { id: "petits-prix", href: shopUrl("/recherche?max=5000"), label: "Petits prix", icon: Tag },
    { id: "nouveautes", href: shopUrl("/recherche?tri=nouveautes"), label: "Nouveautés", icon: Rocket },
    { id: "exclusif", href: shopUrl("/#offres-exclusives"), label: "Exclusivités", icon: Crown },
  ];
}

/** Engagements affichés en bas de page, selon l'univers. */
function promisesFor(universe: ShopUniverse) {
  if (universe === "immobilier") {
    return [
      { icon: <KeyRound size={26} strokeWidth={1.7} />, title: "Contact direct", text: "Sans intermédiaire caché." },
      { icon: <WhatsAppIcon size={26} variant="logo" />, title: "Visite sur WhatsApp", text: "Planifiée en un message." },
      { icon: <ShieldCheck size={26} strokeWidth={1.7} />, title: "Annonceurs suivis", text: "Signalés, ils sont suspendus." },
      { icon: <BadgeCheck size={26} strokeWidth={1.7} />, title: "Avis vérifiés", text: "Laissés par de vrais clients." },
    ];
  }
  if (universe === "services") {
    return [
      { icon: <MapPinned size={26} strokeWidth={1.7} />, title: "Près de chez vous", text: "Des prestataires de votre ville." },
      { icon: <WhatsAppIcon size={26} variant="logo" />, title: "Devis sur WhatsApp", text: "Réponse rapide, sans engagement." },
      { icon: <CalendarCheck size={26} strokeWidth={1.7} />, title: "Rendez-vous simple", text: "Vous fixez la date ensemble." },
      { icon: <BadgeCheck size={26} strokeWidth={1.7} />, title: "Avis vérifiés", text: "Laissés par de vrais clients." },
    ];
  }
  return [
    { icon: <HandCoins size={26} strokeWidth={1.7} />, title: "Paiement à la livraison", text: "Vous payez à la réception." },
    { icon: <WhatsAppIcon size={26} variant="logo" />, title: "Commande sur WhatsApp", text: "Le vendeur vous répond vite." },
    { icon: <ShieldCheck size={26} strokeWidth={1.7} />, title: "Vendeurs suivis", text: "Signalés, ils sont suspendus." },
    { icon: <BadgeCheck size={26} strokeWidth={1.7} />, title: "Avis vérifiés", text: "Laissés par de vrais acheteurs." },
  ];
}

const ctaFor: Record<ShopUniverse, { label: string; icon: LucideIcon }> = {
  vente: { label: "Devenir vendeur", icon: Store },
  immobilier: { label: "Publier une annonce", icon: House },
  services: { label: "Proposer mes services", icon: Handshake },
};

/**
 * Cadre de la marketplace (shop.prestafrik.com) : bandeau (engagements, liens), en-tête avec « Livrer à »
 * (ville du visiteur) et recherche, onglets d'univers (vente, immobilier, services), raccourcis, bandeau
 * défilant des catégories, pied de page et assistant. Première visite : fenêtre « Que recherchez-vous ? ».
 */
export function ShopShell({
  categories,
  scope,
  ticker = [],
  tickerSeconds = 4,
  active,
  query,
  children,
}: {
  categories: ShopCategory[];
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
  const Cta = ctaFor[scope.universe].icon;
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
      <div className="shop-topbar">
        <ul className="shop-topbar-perks">
          <li>
            <HandCoins aria-hidden="true" size={15} /> Paiement à la livraison
          </li>
          <li>
            <WhatsAppIcon size={15} variant="logo" /> Commande confirmée sur WhatsApp
          </li>
        </ul>
        <ShopTicker items={tickerItems} seconds={tickerSeconds} />
        <nav aria-label="Liens utiles" className="shop-topbar-links">
          <a href={siteHref("/aide")}>Aide</a>
          <a data-emplacement="bandeau" href={signupHref()}>
            Devenir vendeur
          </a>
          {whatsapp && (
            <a href={whatsapp} rel="noopener noreferrer" target="_blank">
              Besoin d’aide ? WhatsApp
            </a>
          )}
        </nav>
      </div>

      <header className="shop-header">
        <a aria-label="PrestAfrik, accueil de la marketplace" className="shop-logo" href={shopUrl("/")}>
          <Image alt="" height={40} priority src="/brand/logo-prestafrik.png" width={73} />
          <span className="shop-logo-badge">Shop</span>
        </a>
        <CityPicker current={scope.city?.name ?? null} label={scope.universe === "vente" ? "Livrer à" : "Votre ville"} />
        <VendorSearch bare className="shop-search" defaultValue={query ?? ""} placeholder={scope.universe === "immobilier" ? "Maison, appartement, terrain…" : scope.universe === "services" ? "Coiffure, réparation, traiteur…" : "Rechercher un produit, une boutique…"} resultsPath={shopUrl("/recherche")} />
        <a className="shop-btn shop-btn-glass shop-header-cta" data-emplacement="en-tete" href={signupHref()}>
          <Cta aria-hidden="true" size={18} />
          <span>{ctaFor[scope.universe].label}</span>
        </a>
      </header>

      <UniverseTabs current={scope.universe} home={shopUrl("/")} />
      {!scope.chosen && <UniverseWelcome city={scope.city?.name ?? null} home={shopUrl("/")} />}

      <nav aria-label="Raccourcis" className="shop-rubriques">
        <ul>
          {rubriques.map(({ id, href, label, icon: Icon }) => (
            <li key={id}>
              <a aria-current={active === id ? "page" : undefined} className={`shop-rubrique shop-rubrique--${id}`} href={href}>
                <Icon aria-hidden="true" size={17} /> {label}
              </a>
            </li>
          ))}
          <li>
            <CategoryMenu active={active} categories={categories.map((category) => ({ slug: category.slug, label: category.label, href: categoryHref(category.slug) }))} />
          </li>
        </ul>
      </nav>

      <main className="shop-main" id="shop-contenu">
        {children}
      </main>

      <section aria-label="Nos engagements" className="shop-promises">
        {promisesFor(scope.universe).map(({ icon, title, text }) => (
          <div key={title}>
            <span aria-hidden="true">{icon}</span>
            <strong>{title}</strong>
            <small>{text}</small>
          </div>
        ))}
      </section>

      <footer className="shop-footer">
        <div className="shop-footer-brand">
          <Image alt="PrestAfrik" height={110} src="/brand/logo-white.webp" width={201} />
          <p>{brandIdentity} Paiement à la livraison.</p>
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
            {rubriques.slice(1).map((item) => (
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
