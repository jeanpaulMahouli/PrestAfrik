import Link from "next/link";
import type { StorePromoStyle, StoreTheme } from "@prisma/client";
import type { CSSProperties, ReactNode } from "react";
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
    theme: StoreTheme;
    /** Présentation de la rangée « Promotions » (classe sf-promo-…). */
    promoStyle: StorePromoStyle;
    colors: { primary: string; onPrimary: string; secondary: string; onSecondary: string; accent: string };
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

/** Cadre commun de la vitrine : en-tête, contenu, pied de page, panier et assistant. Thème réel appliqué par classe. */
export function StorefrontShell({ children, base, store, pages, chat, popup = null, isPreview = false, isPaused = false, className = "" }: StorefrontShellProps) {
  const style = {
    "--store-primary": store.colors.primary,
    "--store-on-primary": store.colors.onPrimary,
    "--store-secondary": store.colors.secondary,
    "--store-on-secondary": store.colors.onSecondary,
    "--store-accent": store.colors.accent,
  } as CSSProperties;
  const home = storeHref(base);
  // Pages de PrestAfrik : toujours sur le domaine principal, même depuis le sous-domaine d’une boutique.
  const platform = appBaseUrl();

  return (
    <StoreLinksProvider base={base}>
    <StoreCartProvider storeId={store.id}>
      <div
        className={`sf sf-theme-${cssName(store.theme)} sf-promo-${cssName(store.promoStyle)} ${className}`.trim()}
        data-theme={store.theme}
        style={style}
      >
        <StorefrontPreviewBridge initials={storeInitials(store.name)} />
        <a className="sf-skip" href="#contenu">Aller au contenu</a>
        <header className={`sf-header${pages.length ? " sf-header-with-menu" : ""}`}>
          {pages.length > 0 && <StoreMobileMenu pages={pages} storeName={store.name} storeSlug={store.slug} />}
          <Link className="sf-brand" href={home}>
            <span aria-hidden="true" className="sf-logo" data-store-logo="">
              {store.logoUrl ? <StoreImage alt="" height={88} src={store.logoUrl} width={88} /> : storeInitials(store.name)}
            </span>
            <span className="sf-brand-text">
              <strong data-store-name="">{store.name}</strong>
              {store.city && <small>{store.city}</small>}
            </span>
          </Link>
          {pages.length > 0 && <StoreDesktopNav pages={pages} storeSlug={store.slug} />}
          <div className="sf-header-actions">
            <StorefrontHeaderSearch storeSlug={store.slug} />
            {!isPreview && !isPaused && <StorefrontCartLink storeSlug={store.slug} />}
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
          {pages.length > 0 && (
            <nav aria-label="Informations de la boutique" className="sf-footer-pages">
              {pages.map((page) => (
                <Link href={storeHref(base, "page", page.slug)} key={page.slug}>{page.title}</Link>
              ))}
            </nav>
          )}
          <nav aria-label="Informations légales" className="sf-footer-legal">
            <Link href={`${platform}/legal/conditions-de-vente`}>Conditions de vente</Link>
            <Link href={`${platform}/legal/politique-de-confidentialite`}>Confidentialité</Link>
          </nav>
          <small>Vous commandez directement auprès de {store.name}.</small>
          <small className="sf-powered">
            Powered by <a href={platform}>PrestAfrik</a>
          </small>
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
