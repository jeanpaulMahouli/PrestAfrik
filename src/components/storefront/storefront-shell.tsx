import Link from "next/link";
import Image from "next/image";
import { StoreTheme } from "@prisma/client";
import type { CSSProperties } from "react";
import { StorefrontCartLink } from "@/components/storefront/storefront-cart-link";
import { StoreCartProvider } from "@/components/storefront/store-cart-provider";

type StorefrontStyle = CSSProperties & {
  "--store-primary": string;
  "--store-secondary": string;
  "--store-accent": string;
  "--store-on-primary": string;
  "--store-on-secondary": string;
};

type StorefrontShellProps = {
  children: React.ReactNode;
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  storeCity: string | null;
  storeSlug: string;
  storeTheme: StoreTheme;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  isPreview?: boolean;
  isPaused?: boolean;
};

export function StorefrontShell({
  children,
  storeId,
  storeName,
  storeLogoUrl,
  storeCity,
  storeSlug,
  storeTheme,
  primaryColor,
  secondaryColor,
  accentColor,
  primaryTextColor,
  secondaryTextColor,
  isPreview = false,
  isPaused = false,
}: StorefrontShellProps) {
  const initials = storeName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("fr-FR"))
    .join("");

  return (
    <StoreCartProvider storeId={storeId}>
      <div
        className={`storefront-page theme-${storeTheme.toLowerCase().replaceAll("_", "-")}`}
        style={{
          "--store-primary": primaryColor,
          "--store-secondary": secondaryColor,
          "--store-accent": accentColor,
          "--store-on-primary": primaryTextColor,
          "--store-on-secondary": secondaryTextColor,
        } as StorefrontStyle}
      >
        <header className="storefront-header">
          <Link className="storefront-brand" href={`/boutique/${storeSlug}`}>
            <span aria-hidden="true" className="storefront-logo">
              {storeLogoUrl ? (
                <Image alt="" height={48} src={storeLogoUrl} width={48} />
              ) : (
                initials || "B"
              )}
            </span>
            <span>{storeName}</span>
          </Link>
          <span className="storefront-city">{storeCity}</span>
          {!isPreview && !isPaused && <StorefrontCartLink storeSlug={storeSlug} />}
        </header>
        {isPreview && (
          <div className="storefront-preview-notice" role="status">
            Aperçu privé : ta boutique n’est pas encore publiée et seul un membre connecté peut la voir.
          </div>
        )}
        {isPaused ? (
          <main className="storefront-content">
            <section aria-labelledby="store-paused-title" className="store-paused-notice notice" role="status">
              <h1 id="store-paused-title">Cette boutique est temporairement indisponible</h1>
              <p>Le propriétaire doit renouveler son abonnement pour rétablir l’accès à sa vitrine.</p>
            </section>
          </main>
        ) : children}
        <footer className="storefront-footer">
          <p>Tu commandes directement auprès de {storeName}.</p>
          <Link href={`/boutique/${storeSlug}`}>Retour à la boutique</Link>
          <nav aria-label="Informations légales" className="storefront-legal-links">
            <Link href="/legal/conditions-de-vente">Conditions de vente</Link>
            <Link href="/legal/politique-de-confidentialite">Confidentialité</Link>
          </nav>
          <small>Propulsé par PrestAfrik</small>
        </footer>
      </div>
    </StoreCartProvider>
  );
}
