import "@/styles/shop.css";
import { BadgeCheck, BadgePercent, Crown, HandCoins, LayoutGrid, Rocket, ShieldCheck, Sparkles, Star, Store, Zap } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { VendorSearch } from "@/components/marketplace/vendor-search";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { site } from "@/config/site";
import { shopUrl } from "@/lib/urls";
import { shopCountries, shopCountryCookie, type ShopCountry } from "@/modules/marketplace/country";
import type { ShopCategory } from "@/modules/marketplace/shop";
import { categoryIcon } from "./category-icons";
import { CountryPicker } from "./country-picker";
import { ShopAssistant } from "./shop-assistant";

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
const signupHref = () => siteHref("/inscription");

/**
 * Cadre de la marketplace (shop.prestafrik.com), aux couleurs et composants du tableau de bord :
 * bandeau (pays de livraison, paiement, WhatsApp), en-tête avec recherche, barre des rubriques, bandeau
 * défilant des catégories, pied de page et assistant.
 */
export function ShopShell({
  categories,
  country,
  local,
  active,
  query,
  children,
}: {
  categories: ShopCategory[];
  country: ShopCountry;
  /** Vrai si seules les boutiques du pays du visiteur sont montrées. */
  local: boolean;
  active?: string;
  query?: string;
  children: ReactNode;
}) {
  const whatsappDigits = site.whatsapp?.replace(/\D/g, "");
  const whatsapp = whatsappDigits ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent("Bonjour PrestAfrik, j’ai une question sur la marketplace.")}` : null;
  const rubriques = [
    { id: "toutes", href: shopUrl("/"), label: "Accueil", icon: LayoutGrid },
    { id: "flash", href: shopUrl("/#ventes-flash"), label: "Ventes flash", icon: Zap },
    { id: "promo", href: shopUrl("/recherche?tri=promo&promo=1"), label: "Promotions", icon: BadgePercent },
    { id: "notes", href: shopUrl("/recherche?tri=mieux-notes"), label: "Mieux notés", icon: Star },
    { id: "nouveautes", href: shopUrl("/recherche?tri=nouveautes"), label: "Nouveautés", icon: Rocket },
    { id: "exclusif", href: shopUrl("/#offres-exclusives"), label: "Offres exclusives", icon: Crown },
  ];
  const marquee = categories.length ? [...categories, ...categories] : [];

  return (
    <div className="shop">
      <a className="shop-skip" href="#shop-contenu">
        Aller au contenu
      </a>
      <div className="shop-topbar">
        <CountryPicker cookieName={shopCountryCookie} countries={shopCountries} current={country && local ? country.iso : "CEMAC"} />
        <ul className="shop-topbar-perks">
          <li>
            <HandCoins aria-hidden="true" size={15} /> Paiement à la livraison
          </li>
          <li>
            <WhatsAppIcon size={15} variant="logo" /> Commande confirmée sur WhatsApp
          </li>
        </ul>
        <nav aria-label="Liens utiles" className="shop-topbar-links">
          <a href={siteHref("/aide")}>Aide</a>
          <a href={siteHref("/")}>PrestAfrik.com</a>
          <a className="is-strong" href={signupHref()}>
            Vendre sur PrestAfrik
          </a>
        </nav>
      </div>

      <header className="shop-header">
        <a aria-label="PrestAfrik Shop, accueil de la marketplace" className="shop-logo" href={shopUrl("/")}>
          <Image alt="" height={40} priority src="/brand/logo-prestafrik.png" width={73} />
          <span className="shop-logo-badge">Shop</span>
        </a>
        <VendorSearch bare className="shop-search" defaultValue={query ?? ""} placeholder="Rechercher un produit, une boutique…" resultsPath={shopUrl("/recherche")} />
        <a className="shop-btn shop-btn-primary shop-header-cta" href={signupHref()}>
          <Store aria-hidden="true" size={18} />
          <span>Ouvrir ma boutique</span>
        </a>
      </header>

      <nav aria-label="Rubriques" className="shop-rubriques">
        <ul>
          {rubriques.map(({ id, href, label, icon: Icon }) => (
            <li key={id}>
              <a aria-current={active === id ? "page" : undefined} className={`shop-rubrique shop-rubrique--${id}`} href={href}>
                <Icon aria-hidden="true" size={17} /> {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {marquee.length > 0 && (
        <nav aria-label="Catégories" className="shop-categories-bar">
          {/* La liste est doublée pour un défilement continu ; la copie est ignorée des lecteurs d'écran. */}
          <ul className="shop-marquee">
            {marquee.map((category, index) => {
              const { icon: Icon, tint } = categoryIcon(category.slug);
              const copy = index >= categories.length;
              return (
                <li aria-hidden={copy || undefined} key={`${category.slug}-${index}`}>
                  <a
                    aria-current={active === category.slug ? "page" : undefined}
                    href={categoryHref(category.slug)}
                    style={{ "--tint": tint } as React.CSSProperties}
                    tabIndex={copy ? -1 : undefined}
                  >
                    <Icon aria-hidden="true" size={17} /> {category.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <main className="shop-main" id="shop-contenu">
        {children}
      </main>

      <section aria-label="Nos engagements" className="shop-promises">
        {[
          { icon: <HandCoins size={26} strokeWidth={1.7} />, title: "Paiement à la livraison", text: "Vous payez quand vous recevez." },
          { icon: <WhatsAppIcon size={26} variant="logo" />, title: "Le vendeur vous répond", text: "Commande confirmée sur WhatsApp." },
          { icon: <ShieldCheck size={26} strokeWidth={1.7} />, title: "Boutiques suivies", text: "Signalées, elles sont suspendues." },
          { icon: <BadgeCheck size={26} strokeWidth={1.7} />, title: "Avis vérifiés", text: "Seuls les vrais acheteurs notent." },
        ].map(({ icon, title, text }) => (
          <div key={title}>
            <span aria-hidden="true">{icon}</span>
            <strong>{title}</strong>
            <small>{text}</small>
          </div>
        ))}
      </section>

      <footer className="shop-footer">
        <div className="shop-footer-brand">
          <Image alt="PrestAfrik" height={40} src="/brand/logo-prestafrik.png" width={73} />
          <p>La marketplace des commerçants d’Afrique centrale. Commandez directement aux vendeurs, payez à la livraison.</p>
          <a className="shop-footer-cta" href={signupHref()}>
            <Sparkles aria-hidden="true" size={16} /> Vendre sur PrestAfrik, c’est gratuit
          </a>
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
          <h2>Acheter</h2>
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
