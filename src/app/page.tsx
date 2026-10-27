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
import { site } from "@/config/site";
import { absoluteUrl, jsonLd, sharePreviewImage } from "@/lib/seo";
import { auth } from "@/modules/auth/server";

export const metadata: Metadata = {
  title: { absolute: "PrestAfrik — Votre commerce mérite une vitrine à sa hauteur" },
  description:
    "PrestAfrik : une boutique en ligne gratuite, professionnelle et prête en 5 minutes. Les commandes arrivent sur WhatsApp, le paiement se fait à la livraison.",
  alternates: { canonical: "/" },
};

// Fiche d'identité lue par Google : nom du site dans les résultats, logo et coordonnées de PrestAfrik.
const structuredData = {
  "@graph": [
    {
      "@type": "Organization",
      "@id": absoluteUrl("/#organisation"),
      name: site.name,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/brand/logo-prestafrik.png"),
      image: absoluteUrl(sharePreviewImage.url),
      email: site.email,
      telephone: site.phones[0],
      areaServed: "Afrique",
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#site"),
      name: site.name,
      alternateName: ["Prestafrik", "Prest Afrik", "prestafrik.com"],
      url: absoluteUrl("/"),
      inLanguage: "fr",
      publisher: { "@id": absoluteUrl("/#organisation") },
    },
  ],
};

/** Landing page publique. Les textes et images se modifient dans src/components/landing/content.ts. */
export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const signedIn = Boolean(session);

  return (
    <div className="lp">
      <script dangerouslySetInnerHTML={jsonLd(structuredData)} type="application/ld+json" />
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
