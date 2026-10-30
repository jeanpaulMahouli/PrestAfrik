import "@/styles/shop.css";
import { BadgeCheck, BadgePercent, Crown, HandCoins, LayoutGrid, MessageCircle, ShieldCheck, Sparkles, Star, Store, Truck, Zap } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { VendorSearch } from "@/components/marketplace/vendor-search";
import { site } from "@/config/site";
import { shopUrl } from "@/lib/urls";
import type { ShopCategory } from "@/modules/marketplace/shop";
import { categoryIcon } from "./category-icons";
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

const signupHref = () => `${(process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "")}/inscription`;
const siteHref = (path: string) => `${(process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "")}${path}`;

/**
 * Cadre de la marketplace (shop.prestafrik.com) : bandeau des engagements, en-tête avec recherche,
 * menu des rubriques, pied de page et assistant. Distinct du site vitrine : c'est un magasin.
 */
export function ShopShell({ categories, active, query, children }: { categories: ShopCategory[]; active?: string; query?: string; children: ReactNode }) {
  const whatsappDigits = site.whatsapp?.replace(/\D/g, "");
  const whatsapp = whatsappDigits ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent("Bonjour PrestAfrik, j’ai une question sur la marketplace.")}` : null;
  const specials = [
    { href: shopUrl("/#ventes-flash"), label: "Ventes flash", icon: Zap, className: "is-flash" },
    { href: shopUrl("/recherche?tri=promo&promo=1"), label: "Promotions", icon: BadgePercent, className: "is-promo" },
    { href: shopUrl("/recherche?tri=mieux-notes"), label: "Mieux notés", icon: Star, className: "" },
    { href: shopUrl("/#offres-exclusives"), label: "Offres exclusives", icon: Crown, className: "is-gold" },
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
            <MessageCircle aria-hidden="true" size={15} /> Commande confirmée sur WhatsApp
          </li>
          <li>
            <Truck aria-hidden="true" size={15} /> Livraison dans toute la zone CEMAC
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
        <VendorSearch bare className="shop-search" defaultValue={query ?? ""} placeholder="Rechercher un produit, une boutique, une ville…" resultsPath={shopUrl("/recherche")} />
        <a className="shop-header-cta" href={signupHref()}>
          <Store aria-hidden="true" size={18} />
          <span>Ouvrir ma boutique</span>
        </a>
      </header>

      <nav aria-label="Rubriques" className="shop-catnav">
        <ul>
          <li>
            <a aria-current={active === "toutes" ? "page" : undefined} className="shop-catnav-all" href={shopUrl("/#rubriques")}>
              <LayoutGrid aria-hidden="true" size={17} /> Toutes les rubriques
            </a>
          </li>
          {specials.map(({ href, label, icon: Icon, className }) => (
            <li key={label}>
              <a className={className} href={href}>
                <Icon aria-hidden="true" size={17} /> {label}
              </a>
            </li>
          ))}
          {categories.map((category) => {
            const { icon: Icon, tint } = categoryIcon(category.slug);
            return (
              <li key={category.slug}>
                <a aria-current={active === category.slug ? "page" : undefined} href={categoryHref(category.slug)} style={{ "--tint": tint } as React.CSSProperties}>
                  <Icon aria-hidden="true" size={17} /> {category.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <main className="shop-main" id="shop-contenu">
        {children}
      </main>

      <section aria-label="Nos engagements" className="shop-promises">
        {[
          { icon: HandCoins, title: "Paiement à la livraison", text: "Vous payez quand vous recevez." },
          { icon: MessageCircle, title: "Le vendeur vous répond", text: "Commande confirmée sur WhatsApp." },
          { icon: ShieldCheck, title: "Boutiques suivies", text: "Signalées, elles sont suspendues." },
          { icon: BadgeCheck, title: "Avis vérifiés", text: "Seuls les vrais acheteurs notent." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <Icon aria-hidden="true" size={28} strokeWidth={1.7} />
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
        <nav aria-label="Rubriques populaires">
          <h2>Rubriques</h2>
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
            <li>
              <a href={shopUrl("/#ventes-flash")}>Ventes flash</a>
            </li>
            <li>
              <a href={shopUrl("/recherche?tri=promo&promo=1")}>Promotions</a>
            </li>
            <li>
              <a href={shopUrl("/recherche?tri=mieux-notes")}>Mieux notés</a>
            </li>
            <li>
              <a href={shopUrl("/recherche?tri=nouveautes")}>Nouveautés</a>
            </li>
            <li>
              <a href={shopUrl("/#boutiques")}>Toutes les boutiques</a>
            </li>
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
