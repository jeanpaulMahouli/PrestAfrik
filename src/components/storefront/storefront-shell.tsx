import Link from "next/link";
import { StoreSearchInput } from "@/components/storefront/store-search-input";
import type { StorePromoStyle } from "@prisma/client";
import type { ReactNode } from "react";
import { StoreChatWidget, type ChatWidgetConfig } from "@/components/storefront/store-chat-widget";
import { StorefrontCartBar, StorefrontCartLink } from "@/components/storefront/storefront-cart-link";
import { StorefrontHeaderSearch } from "@/components/storefront/storefront-header-search";
import { StoreCartProvider } from "@/components/storefront/store-cart-provider";
import { StorefrontPreviewBridge } from "@/components/storefront/storefront-preview-bridge";
import { StoreLinksProvider } from "@/components/storefront/store-links";
import { StoreDesktopNav, StoreMobileMenu } from "@/components/storefront/store-menu";
import { StorePopup, type StorePopupData } from "@/components/storefront/store-popup";
import { VisitBeacon } from "@/components/storefront/visit-beacon";
import { StoreImage } from "@/components/ui/store-image";
import { FacebookLogo, InstagramLogo, Search, TiktokLogo, XLogo, YoutubeLogo } from "@/components/ui/icons";
import { socialNetworks, type SocialLinks } from "@/modules/stores/social-links";
import { storeHref } from "@/lib/store-host";
import { appBaseUrl } from "@/lib/urls";

type StorefrontShellProps = {
  children: ReactNode;
  /** Début des liens de la boutique : « » en sous-domaine, « /adresse » sur le domaine principal. */
  base: string;
  store: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    logoUrl: string | null;
    /** Présentation au pied de page (description de la boutique). */
    description?: string | null;
    /** Réseaux sociaux affichés au pied de page. */
    social?: Partial<SocialLinks>;
    /** Présentation de la rangée « Promotions » (classe sf-promo-…), seul réglage d'apparence du vendeur. */
    promoStyle: StorePromoStyle;
  };
  pages: { title: string; slug: string }[];
  chat: ChatWidgetConfig | null;
  /** Popup d’accueil actif (Marketing → Popups). */
  popup?: StorePopupData | null;
  isPreview?: boolean;
  isPaused?: boolean;
  /** Classes supplémentaires (polices du thème). */
  className?: string;
};

const cssName = (value: string) => value.toLowerCase().replaceAll("_", "-");

export function storeInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("") || "B";
}

const socialIcons = { facebookUrl: FacebookLogo, instagramUrl: InstagramLogo, tiktokUrl: TiktokLogo, youtubeUrl: YoutubeLogo, xUrl: XLogo };

/**
 * Cadre commun de la vitrine (maquettes « Boutiques publiques ») : en-tête avec recherche, contenu, pied de page
 * sombre avec réseaux sociaux, panier et assistant. Toutes les boutiques ont la même apparence ; seul le style
 * des promotions (classe sf-promo-…) change.
 */
export function StorefrontShell({ children, base, store, pages, chat, popup = null, isPreview = false, isPaused = false, className = "" }: StorefrontShellProps) {
  const home = storeHref(base);
  // Pages de PrestAfrik : toujours sur le domaine principal, même depuis le sous-domaine d’une boutique.
  const platform = appBaseUrl();
  const socials = socialNetworks.filter((network) => store.social?.[network.key]);

  return (
    <StoreLinksProvider base={base}>
    <StoreCartProvider storeId={store.id}>
      <div
        className={`sf sf-v2 sf-promo-${cssName(store.promoStyle)} ${className}`.trim()}
      >
        <StorefrontPreviewBridge initials={storeInitials(store.name)} />
        <a className="sf-skip" href="#contenu">Aller au contenu</a>
        <header className="sf-header">
          <Link className="sf-brand" href={home}>
            <span aria-hidden="true" className="sf-logo" data-store-logo="">
              {store.logoUrl ? <StoreImage alt="" height={88} src={store.logoUrl} width={88} /> : storeInitials(store.name)}
            </span>
            <span className="sf-brand-text">
              <strong data-store-name="">{store.name}</strong>
              {store.city && <small>{store.city}</small>}
            </span>
          </Link>
          <form action={home} className="sf-header-searchbar" role="search">
            <label className="visually-hidden" htmlFor="sf-header-q">Rechercher un produit</label>
            <Search aria-hidden="true" size={20} />
            <StoreSearchInput id="sf-header-q" storeSlug={store.slug} />
          </form>
          {pages.length > 0 && <StoreDesktopNav pages={pages} storeSlug={store.slug} />}
          <div className="sf-header-actions">
            <StorefrontHeaderSearch storeSlug={store.slug} />
            {!isPreview && !isPaused && <StorefrontCartLink storeSlug={store.slug} />}
            <StoreMobileMenu pages={pages} storeName={store.name} storeSlug={store.slug} />
          </div>
        </header>
        {isPreview && (
          <p className="sf-notice sf-notice-preview" role="status">
            Aperçu privé : votre boutique n’est pas encore publiée. Vous seul la voyez.
          </p>
        )}
        <div className="sf-main" id="contenu">
          {isPaused ? (
            <section aria-labelledby="store-paused-title" className="sf-empty">
              <h1 id="store-paused-title">Cette boutique est temporairement indisponible</h1>
              <p>Revenez un peu plus tard : elle sera bientôt de nouveau ouverte.</p>
            </section>
          ) : (
            children
          )}
        </div>
        <footer className="sf-footer">
          <div className="sf-footer-inner">
            <div className="sf-footer-brand">
              <Link className="sf-footer-logo" href={home}>
                <span aria-hidden="true" className="sf-logo" data-store-logo="">
                  {store.logoUrl ? <StoreImage alt="" height={88} src={store.logoUrl} width={88} /> : storeInitials(store.name)}
                </span>
                <strong data-store-name="">{store.name}</strong>
              </Link>
              {store.description?.trim() ? (
                <p data-store-description="">{store.description.trim().slice(0, 220)}{store.description.trim().length > 220 ? "…" : ""}</p>
              ) : (
                <p>Boutique en ligne{store.city ? ` à ${store.city}` : ""}. Commandez en quelques secondes, payez à la livraison.</p>
              )}
              {socials.length > 0 && (
                <ul aria-label={`${store.name} sur les réseaux sociaux`} className="sf-footer-social">
                  {socials.map((network) => {
                    const Icon = socialIcons[network.key];
                    return (
                      <li key={network.key}>
                        <a aria-label={`${store.name} sur ${network.label}`} href={store.social?.[network.key] ?? "#"} rel="noopener noreferrer" target="_blank">
                          <Icon aria-hidden="true" size={22} weight="fill" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <nav aria-label="La boutique" className="sf-footer-col">
              <h2>La boutique</h2>
              <Link href={home}>Tous les produits</Link>
              <Link href={storeHref(base, "promotions")}>Promotions</Link>
              {pages.map((page) => (
                <Link href={storeHref(base, "page", page.slug)} key={page.slug}>{page.title}</Link>
              ))}
            </nav>
            <nav aria-label="Aide à l’achat" className="sf-footer-col">
              <h2>Aide à l’achat</h2>
              {!isPreview && !isPaused && <Link href={storeHref(base, "panier")}>Mon panier</Link>}
              <span>Paiement à la livraison</span>
              <span>Suivi de commande par WhatsApp</span>
              <Link href={storeHref(base, "infos", "conditions-de-vente")}>Conditions de vente</Link>
              <Link href={storeHref(base, "infos", "politique-de-confidentialite")}>Confidentialité</Link>
            </nav>
          </div>
          <div className="sf-footer-bottom">
            <small>Vous commandez directement auprès de {store.name}.</small>
            <small className="sf-powered">
              Powered by <a href={platform}>PrestAfrik</a>
            </small>
          </div>
        </footer>
        {!isPreview && !isPaused && <StorefrontCartBar storeSlug={store.slug} />}
        {!isPreview && <VisitBeacon storeId={store.id} storeSlug={store.slug} />}
        {!isPaused && popup && <StorePopup popup={popup} storeId={store.id} />}
        {!isPaused && chat && <StoreChatWidget config={chat} logoUrl={store.logoUrl} storeInitials={storeInitials(store.name)} storeName={store.name} storeSlug={store.slug} />}
      </div>
    </StoreCartProvider>
    </StoreLinksProvider>
  );
}
