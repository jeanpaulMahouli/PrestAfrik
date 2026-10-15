import Image from "next/image";
import Link from "next/link";
import { texts } from "@/config/texts";
import { EmailVerificationBanner } from "@/components/layout/email-verification-banner";
import { VendorDrawer, VendorSidebar } from "@/components/layout/vendor-navigation";
import { MobileSearchButton, StoreSwitcher, UserMenu } from "@/components/layout/vendor-topbar-menus";
import { getStoreContext } from "@/modules/stores/context";

const t = texts.vendor.shell;

/**
 * Mise en page de l'espace vendeur (maquette « Accueil vendeur », 1280 px) : barre du haut de 56 px,
 * menu latéral de 216 px fixe dès 1024 px, tiroir en dessous.
 * Le contexte (boutique, rôle, utilisateur) est relu ici : il est mémoïsé pour la requête.
 */
export async function VendorShell({ children }: { children: React.ReactNode }) {
  const { session, store, memberships, membership } = await getStoreContext();

  return (
    <div className="vendor-shell">
      <header className="vendor-topbar">
        <VendorDrawer role={membership.role} storeName={store.name} />
        <Link aria-label="PrestAfrik, accueil de mon espace" className="vendor-logo" href="/dashboard">
          <Image alt="" height={34} priority src="/brand/logo-prestafrik.png" width={62} />
        </Link>
        <form action="/dashboard/recherche" className="vendor-search" role="search">
          <input aria-label={t.searchLabel} maxLength={80} name="q" placeholder={t.searchPlaceholder} type="search" />
        </form>
        <span className="vendor-topbar-spacer" />
        <MobileSearchButton />
        <StoreSwitcher
          memberships={memberships.map(({ storeId, role, store: memberStore }) => ({
            storeId,
            role,
            store: { name: memberStore.name, city: memberStore.city },
          }))}
          storeId={store.id}
          storeName={store.name}
        />
        <UserMenu userEmail={session.user.email} userName={session.user.name} />
      </header>
      {!session.user.emailVerified && <EmailVerificationBanner email={session.user.email} />}
      <div className="vendor-body">
        <VendorSidebar role={membership.role} />
        <main className="vendor-main" id="contenu">
          {children}
        </main>
      </div>
    </div>
  );
}
