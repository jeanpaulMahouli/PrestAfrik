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
import { SupportWhatsapp } from "@/components/landing/support-whatsapp";
import { Testimonials } from "@/components/landing/testimonials";
import { faq } from "@/components/landing/content";
import { absoluteUrl, jsonLd, sharePreviewImage } from "@/lib/seo";
import { sellerLandingPath } from "@/lib/urls";
import { auth } from "@/modules/auth/server";

export const metadata: Metadata = {
  // Page des vendeurs : le titre commence par l'action, pour ne pas concurrencer l'accueil (la marketplace)
  // sur la recherche « PrestAfrik ».
  title: { absolute: "Vendez en ligne sans limite avec PrestAfrik : votre boutique sur WhatsApp" },
  description:
    "Créez votre boutique en 5 minutes depuis votre téléphone, recevez vos commandes sur WhatsApp et soyez payé à la livraison. Devenez vendeur sur PrestAfrik.",
  alternates: { canonical: sellerLandingPath },
  openGraph: {
    type: "website",
    url: sellerLandingPath,
    siteName: "PrestAfrik",
    locale: "fr_CM",
    title: "Devenez vendeur sur PrestAfrik : vendez en ligne sans limite",
    description: "Votre boutique en ligne en 5 minutes, vos commandes sur WhatsApp, le paiement à la livraison.",
    images: [sharePreviewImage],
  },
};

// Questions fréquentes des vendeurs (mêmes textes que la section affichée).
const structuredData = {
  "@type": "FAQPage",
  "@id": absoluteUrl(`${sellerLandingPath}#faq`),
  mainEntity: faq.items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

/** Page « Devenir vendeur » (prestafrik.com/boutique), ancienne page d'accueil. Les textes et images se modifient dans src/components/landing/content.ts. */
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
      <SupportWhatsapp />
    </div>
  );
}
