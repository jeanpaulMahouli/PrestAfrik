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
import { faq, footer } from "@/components/landing/content";
import { site } from "@/config/site";
import { absoluteUrl, jsonLd, sharePreviewImage } from "@/lib/seo";
import { shopUrl } from "@/lib/urls";
import { auth } from "@/modules/auth/server";

export const metadata: Metadata = {
  // Le nom de la marque en tête : c'est ce que Google affiche (et compare) quand on cherche « PrestAfrik ».
  title: { absolute: "PrestAfrik : créez votre boutique en ligne gratuite et vendez sur WhatsApp" },
  description:
    "PrestAfrik, la plateforme des commerçants du Cameroun et de la zone CEMAC : créez gratuitement votre boutique en ligne en 5 minutes, vos clients commandent, vous confirmez sur WhatsApp, ils paient à la livraison.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "PrestAfrik",
    locale: "fr_FR",
    title: "PrestAfrik : votre boutique en ligne gratuite, commandes sur WhatsApp",
    description: "Créez votre boutique en 5 minutes, recevez vos commandes sur WhatsApp, faites-vous payer à la livraison. Cameroun et zone CEMAC.",
    images: [sharePreviewImage],
  },
  // Vérification du domaine dans Meta Business (WhatsApp Business, application Meta).
  other: { "facebook-domain-verification": "8vvpr2rgpc7l5hw1ml7itmdhaxx01i" },
};

/** Pays de la zone CEMAC, où PrestAfrik est proposé. */
const cemac = ["Cameroun", "Gabon", "République du Congo", "Tchad", "République centrafricaine", "Guinée équatoriale"];

// Fiche d'identité lue par Google : nom du site dans les résultats, logo, description, réseaux sociaux
// (« sameAs » relie ces comptes à PrestAfrik pour son panneau de marque) et coordonnées.
const structuredData = {
  "@graph": [
    {
      "@type": "Organization",
      "@id": absoluteUrl("/#organisation"),
      name: site.name,
      alternateName: ["Prestafrik", "Prest Afrik", "PrestAfrik Shop", "prestafrik.com"],
      description:
        "PrestAfrik permet aux commerçants du Cameroun et de la zone CEMAC de créer leur boutique en ligne en 5 minutes, de recevoir leurs commandes sur WhatsApp et d'être payés à la livraison. Marketplace : PrestAfrik Shop.",
      url: absoluteUrl("/"),
      logo: { "@type": "ImageObject", url: absoluteUrl("/brand/logo-prestafrik.png") },
      image: absoluteUrl(sharePreviewImage.url),
      email: site.email,
      telephone: site.phones[0],
      areaServed: cemac.map((name) => ({ "@type": "Country", name })),
      knowsLanguage: "fr",
      sameAs: [...footer.socials.map((social) => social.href), site.youtube, shopUrl("/")].filter((url) => /^https?:\/\//.test(url)),
      contactPoint: site.phones.map((telephone) => ({
        "@type": "ContactPoint",
        telephone,
        email: site.email,
        contactType: "customer support",
        areaServed: "CM",
        availableLanguage: "French",
      })),
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#site"),
      name: site.name,
      alternateName: ["Prestafrik", "Prest Afrik", "prestafrik.com"],
      description: "Boutique en ligne gratuite, commandes sur WhatsApp et paiement à la livraison, au Cameroun et dans la zone CEMAC.",
      url: absoluteUrl("/"),
      inLanguage: "fr",
      publisher: { "@id": absoluteUrl("/#organisation") },
      // Champ de recherche du site dans les résultats Google : la recherche de vendeurs.
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/recherche")}?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    // Questions fréquentes de la page (mêmes textes que la section affichée).
    {
      "@type": "FAQPage",
      "@id": absoluteUrl("/#faq"),
      mainEntity: faq.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
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
      <SupportWhatsapp />
    </div>
  );
}
