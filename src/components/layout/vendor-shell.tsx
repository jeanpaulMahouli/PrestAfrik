import Image from "next/image";
import Link from "next/link";
import { texts } from "@/config/texts";
import { EmailVerificationBanner } from "@/components/layout/email-verification-banner";
import { PwaRegistration } from "@/components/pwa/install-app";
import { VendorDrawer, VendorSidebar } from "@/components/layout/vendor-navigation";
import { MobileSearchButton, StoreSwitcher, UserMenu, VisitStoreLinks } from "@/components/layout/vendor-topbar-menus";
import { storePublicUrl } from "@/lib/urls";
import { isPlatformAdmin } from "@/modules/admin/context";
import { accountContact, isAccountVerified } from "@/modules/auth/phone-account";
import { getStoreContext } from "@/modules/stores/context";

const t = texts.vendor.shell;

/**
 * Mise en page de l'espace vendeur (maquette « Accueil vendeur », 1280 px) : barre du haut de 56 px,
 * menu latéral de 216 px fixe dès 1024 px, tiroir en dessous.
 * Le contexte (boutique, rôle, utilisateur) est relu ici : il est mémoïsé pour la requête.
 */
export async function VendorShell({ children, searchQuery }: { children: React.ReactNode; searchQuery?: string }) {
  const { session, store, memberships, membership } = await getStoreContext();
  const showAdminLink = await isPlatformAdmin(session.user.id);

  return (
    <div className="vendor-shell">
      <PwaRegistration />
      <header className="vendor-topbar">
        <VendorDrawer role={membership.role} storeName={store.name} />
        <Link aria-label="PrestAfrik, accueil de mon espace" className="vendor-logo" href="/dashboard">
          <Image alt="" height={34} priority src="/brand/logo-prestafrik.png" width={62} />
        </Link>
        <form action="/dashboard/recherche" className="vendor-search" role="search">
          <svg aria-hidden="true" className="vendor-search-icon" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input aria-label={t.searchLabel} defaultValue={searchQuery} key={searchQuery} maxLength={80} minLength={2} name="q" placeholder={t.searchPlaceholder} required type="search" />
        </form>
        <span className="vendor-topbar-spacer" />
        <MobileSearchButton />
        <VisitStoreLinks storeUrl={storePublicUrl(store.slug)} />
        <StoreSwitcher
          memberships={memberships.map(({ storeId, role, store: memberStore }) => ({
            storeId,
            role,
            store: { name: memberStore.name, city: memberStore.city, logoUrl: memberStore.logoUrl },
          }))}
          storeId={store.id}
          storeLogoUrl={store.logoUrl}
          storeName={store.name}
        />
        <UserMenu adminLink={showAdminLink} userEmail={accountContact(session.user)} userImage={session.user.image ?? null} userName={session.user.name} />
      </header>
      {!isAccountVerified(session.user) && <EmailVerificationBanner />}
      {store.suspendedAt && (
        <p className="v-banner v-banner-danger vendor-suspension-banner" role="alert">
          <strong>{store.name} est suspendue par l’équipe PrestAfrik.</strong> Vos clients ne la voient plus. Motif : {store.suspensionReason ?? "non précisé"}. Répondez à l’e-mail reçu pour la rétablir.
        </p>
      )}
      <div className="vendor-body">
        <VendorSidebar role={membership.role} />
        <main className="vendor-main" id="contenu">
          {children}
        </main>
      </div>
    </div>
  );
}
