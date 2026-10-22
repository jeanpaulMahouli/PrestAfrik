import { headers } from "next/headers";
import type { ReactNode } from "react";
import { fontVariables } from "@/lib/fonts";
import { auth } from "@/modules/auth/server";
import { FinalCta } from "./final-cta";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export type PageHeroProps = {
  title: string;
  subtitle?: string;
  /** Boutons ou contenu supplémentaire sous le sous-titre. */
  actions?: ReactNode;
};

/** Session facultative : les pages publiques adaptent leurs boutons quand le vendeur est connecté. */
export async function isSignedIn() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  return Boolean(session);
}

/**
 * Gabarit des pages publiques secondaires (Fonctionnalités, À propos, Démo, Blog, Contact) :
 * même carte orangée que l'accueil en version compacte, contenu, dernier appel à l'action et pied de page.
 */
export function PageShell({ hero, signedIn, children, cta = true }: { hero: PageHeroProps; signedIn: boolean; children: ReactNode; cta?: boolean }) {
  return (
    <div className={`lp lp-page ${fontVariables}`}>
      <a className="lp-skip" href="#contenu">
        Aller au contenu
      </a>
      <section aria-labelledby="page-title" className="lp-hero lp-page-hero">
        <SiteHeader signedIn={signedIn} />
        <div aria-hidden="true" className="lp-page-hero__decor">
          <span className="lp-pillar lp-page-hero__pillar lp-page-hero__pillar--1" />
          <span className="lp-pillar lp-page-hero__pillar lp-page-hero__pillar--2" />
          <span className="lp-pillar lp-page-hero__pillar lp-page-hero__pillar--3" />
        </div>
        <div className="lp-page-hero__copy">
          <h1 className="lp-page-hero__title lp-intro lp-intro--2" id="page-title">
            {hero.title}
          </h1>
          {hero.subtitle && <p className="lp-hero__subtitle lp-intro lp-intro--2">{hero.subtitle}</p>}
          {hero.actions && <div className="lp-hero__actions lp-intro lp-intro--3">{hero.actions}</div>}
        </div>
      </section>
      <main id="contenu">
        {children}
        {cta && <FinalCta signedIn={signedIn} />}
      </main>
      <SiteFooter />
    </div>
  );
}
