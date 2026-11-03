import Image from "next/image";
import Link from "next/link";
import { EmailVerificationBanner } from "@/components/layout/email-verification-banner";
import { VendorMobileNav, VendorSidebar } from "@/components/layout/vendor-navigation";
import { UserMenu } from "@/components/layout/vendor-topbar-menus";
import { PwaRegistration } from "@/components/pwa/install-app";

type WelcomeNoStoreProps = {
  firstName: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  adminLink: boolean;
  emailVerified: boolean;
  /** Assistant déjà commencé : le bouton le reprend là où il s'était arrêté. */
  createHref: string;
  /** Création déjà commencée : « Reprendre » plutôt que « Créer ». */
  resuming: boolean;
};

/**
 * Tableau de bord d'un compte sans boutique (juste après l'inscription, ou boutique pas encore créée) :
 * la mise en page habituelle, mais rien d'autre qu'un mot de bienvenue et « Créer ma première boutique ».
 * Les autres rubriques sont grisées jusqu'à la création de la boutique.
 */
export function WelcomeNoStore({ firstName, userName, userEmail, userImage, adminLink, emailVerified, createHref, resuming }: WelcomeNoStoreProps) {
  return (
    <div className="vendor-shell">
      <PwaRegistration />
      <header className="vendor-topbar">
        <Link aria-label="PrestAfrik, accueil de mon espace" className="vendor-logo" href="/dashboard">
          <Image alt="" height={34} priority src="/brand/logo-prestafrik.png" width={62} />
        </Link>
        <span className="vendor-topbar-spacer" />
        <UserMenu adminLink={adminLink} userEmail={userEmail} userImage={userImage} userName={userName} />
      </header>
      {!emailVerified && <EmailVerificationBanner />}
      <div className="vendor-body">
        <VendorSidebar locked role="OWNER" />
        <main className="vendor-main welcome-main" id="contenu">
          <section aria-labelledby="welcome-title" className="welcome-card">
            <span aria-hidden="true" className="welcome-emoji">👋</span>
            <h1 id="welcome-title">Bienvenue {firstName} !</h1>
            <p className="welcome-lead">
              Il ne reste qu’une étape pour recevoir vos premières commandes sur WhatsApp : créer votre boutique en ligne. C’est gratuit et cela prend environ 5
              minutes.
            </p>
            <Link className="btn btn-primary btn-lg welcome-cta" href={createHref}>
              {resuming ? "Reprendre la création de ma boutique" : "Créer ma première boutique"}
            </Link>
          </section>
        </main>
      </div>
      <VendorMobileNav locked role="OWNER" storeName="PrestAfrik" />
    </div>
  );
}
