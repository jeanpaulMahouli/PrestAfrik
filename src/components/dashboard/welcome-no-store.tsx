import Image from "next/image";
import Link from "next/link";
import { EmailVerificationBanner } from "@/components/layout/email-verification-banner";
import { UserMenu } from "@/components/layout/vendor-topbar-menus";
import { PwaRegistration } from "@/components/pwa/install-app";
import { Confetti } from "@/components/ui/confetti";

type WelcomeNoStoreProps = {
  firstName: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  adminLink: boolean;
  emailVerified: boolean;
  /** Arrivée juste après l'inscription : félicitations et confettis. */
  justSignedUp: boolean;
  /** Assistant déjà commencé : le bouton le reprend là où il s'était arrêté. */
  createHref: string;
};

/** Tableau de bord d'un compte sans boutique : une seule prochaine étape, « Créer ma boutique maintenant ». */
export function WelcomeNoStore({ firstName, userName, userEmail, userImage, adminLink, emailVerified, justSignedUp, createHref }: WelcomeNoStoreProps) {
  return (
    <div className="vendor-shell welcome-shell">
      <PwaRegistration />
      {justSignedUp && <Confetti />}
      <header className="vendor-topbar">
        <Link aria-label="PrestAfrik, accueil de mon espace" className="vendor-logo" href="/dashboard">
          <Image alt="" height={34} priority src="/brand/logo-prestafrik.png" width={62} />
        </Link>
        <span className="vendor-topbar-spacer" />
        <UserMenu adminLink={adminLink} userEmail={userEmail} userImage={userImage} userName={userName} />
      </header>
      {!emailVerified && <EmailVerificationBanner />}
      <main className="welcome-main" id="contenu">
        <section aria-labelledby="welcome-title" className="welcome-card">
          <span aria-hidden="true" className="welcome-emoji">🎉</span>
          <h1 id="welcome-title">{justSignedUp ? `Félicitations ${firstName}, votre compte est prêt !` : `Bienvenue ${firstName} !`}</h1>
          <p className="welcome-lead">
            {justSignedUp
              ? "Bienvenue sur PrestAfrik. Il ne reste qu’une étape pour recevoir vos premières commandes sur WhatsApp : créer votre boutique en ligne. C’est gratuit et cela prend environ 5 minutes."
              : "Vous n’avez pas encore de boutique. Créez-la quand vous voulez : c’est gratuit et cela prend environ 5 minutes."}
          </p>
          <p className="welcome-next">
            <span>Prochaine étape</span>
          </p>
          <Link className="btn btn-primary btn-lg welcome-cta" href={createHref}>
            Créer ma boutique maintenant
          </Link>
        </section>
      </main>
    </div>
  );
}
