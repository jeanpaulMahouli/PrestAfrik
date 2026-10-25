import "@/styles/landing-site.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { ClientShowcase } from "@/components/landing/client-showcase";
import { DashboardShowcase } from "@/components/landing/dashboard-showcase";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { Partners } from "@/components/landing/partners";
import { SiteFooter } from "@/components/landing/site-footer";
import { Testimonials } from "@/components/landing/testimonials";
import { auth } from "@/modules/auth/server";

export const metadata: Metadata = {
  title: { absolute: "PrestAfrik — Votre commerce mérite une vitrine à sa hauteur" },
  description:
    "Une boutique en ligne gratuite, professionnelle et prête en 5 minutes. Les commandes arrivent sur WhatsApp, le paiement se fait à la livraison.",
};

/** Landing page publique. Les textes et images se modifient dans src/components/landing/content.ts. */
export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const signedIn = Boolean(session);

  return (
    <div className="lp">
      <a className="lp-skip" href="#contenu">
        Aller au contenu
      </a>
      <Hero signedIn={signedIn} />
      <main id="contenu">
        <Partners />
        <DashboardShowcase />
        <ClientShowcase signedIn={signedIn} />
        <Testimonials />
        <Faq />
        <FinalCta signedIn={signedIn} />
      </main>
      <SiteFooter />
    </div>
  );
}
