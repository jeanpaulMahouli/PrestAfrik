import Link from "next/link";
import type { StoreTheme } from "@prisma/client";
import type { CSSProperties, ReactNode } from "react";
import { StoreChatWidget, type ChatWidgetConfig } from "@/components/storefront/store-chat-widget";
import { StorefrontCartBar, StorefrontCartLink } from "@/components/storefront/storefront-cart-link";
import { StoreCartProvider } from "@/components/storefront/store-cart-provider";
import { StoreImage } from "@/components/ui/store-image";

type StorefrontShellProps = {
  children: ReactNode;
  store: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    logoUrl: string | null;
    theme: StoreTheme;
    colors: { primary: string; onPrimary: string; secondary: string; onSecondary: string; accent: string };
  };
  pages: { title: string; slug: string }[];
  chat: ChatWidgetConfig | null;
  isPreview?: boolean;
  isPaused?: boolean;
};

export function storeInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("") || "B";
}

/** Cadre commun de la vitrine : en-tête, contenu, pied de page, panier et assistant. Thème réel appliqué par classe. */
export function StorefrontShell({ children, store, pages, chat, isPreview = false, isPaused = false }: StorefrontShellProps) {
  const style = {
    "--store-primary": store.colors.primary,
    "--store-on-primary": store.colors.onPrimary,
    "--store-secondary": store.colors.secondary,
    "--store-on-secondary": store.colors.onSecondary,
    "--store-accent": store.colors.accent,
  } as CSSProperties;
  const home = `/boutique/${store.slug}`;

  return (
    <StoreCartProvider storeId={store.id}>
      <div className={`sf sf-theme-${store.theme.toLowerCase().replaceAll("_", "-")}`} style={style}>
        <a className="sf-skip" href="#contenu">Aller au contenu</a>
        <header className="sf-header">
          <Link className="sf-brand" href={home}>
            <span aria-hidden="true" className="sf-logo">
              {store.logoUrl ? <StoreImage alt="" height={88} src={store.logoUrl} width={88} /> : storeInitials(store.name)}
            </span>
            <span className="sf-brand-text">
              <strong>{store.name}</strong>
              {store.city && <small>{store.city}</small>}
            </span>
          </Link>
          {!isPreview && !isPaused && <StorefrontCartLink storeSlug={store.slug} />}
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
                <Link href={`${home}/page/${page.slug}`} key={page.slug}>{page.title}</Link>
              ))}
            </nav>
          )}
          <nav aria-label="Informations légales" className="sf-footer-legal">
            <Link href="/legal/conditions-de-vente">Conditions de vente</Link>
            <Link href="/legal/politique-de-confidentialite">Confidentialité</Link>
          </nav>
          <small>Vous commandez directement auprès de {store.name}. Propulsé par PrestAfrik.</small>
        </footer>
        {!isPreview && !isPaused && <StorefrontCartBar storeSlug={store.slug} />}
        {!isPaused && chat && <StoreChatWidget config={chat} logoUrl={store.logoUrl} storeInitials={storeInitials(store.name)} storeName={store.name} storeSlug={store.slug} />}
      </div>
    </StoreCartProvider>
  );
}
