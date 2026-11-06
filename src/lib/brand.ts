// Identité de PrestAfrik pour Google et les moteurs IA : phrase d'identité (répétée sur l'accueil, la page
// À propos, les métadonnées et le schéma Organization) et données structurées de l'accueil.
import { footer } from "@/components/landing/content";
import { site } from "@/config/site";
import { absoluteUrl, sharePreviewImage } from "@/lib/seo";

/** Phrase d'identité : la même partout, pour que Google et les moteurs IA décrivent PrestAfrik de façon cohérente. */
export const brandIdentity = "PrestAfrik est la marketplace camerounaise qui met directement en relation les vendeurs et les clients, le tout sur WhatsApp.";

/** Slogan de PrestAfrik. */
export const brandSlogan = "Vendez en ligne sans limite";

/** Date de lancement public. */
export const launchDate = "2026-10-24";

/**
 * Données structurées de l'accueil (prestafrik.com, la marketplace), et de l'accueil seulement :
 * Google associe ainsi clairement la marque à cette page. Organization (nom, logo, réseaux sociaux,
 * contacts) et WebSite (nom du site dans les résultats, recherche de produits et de vendeurs).
 */
export function brandStructuredData() {
  return {
    "@graph": [
      {
        "@type": "Organization",
        "@id": absoluteUrl("/#organisation"),
        name: site.name,
        alternateName: ["Prestafrik", "Prest Afrik", "PrestAfrik Shop", "prestafrik.com"],
        description: brandIdentity,
        slogan: brandSlogan,
        url: absoluteUrl("/"),
        logo: { "@type": "ImageObject", url: absoluteUrl("/brand/logo-prestafrik.png") },
        image: absoluteUrl(sharePreviewImage.url),
        email: site.email,
        telephone: site.phones[0],
        areaServed: { "@type": "Country", name: "Cameroun", identifier: "CM" },
        knowsLanguage: "fr",
        // Comptes officiels : TikTok, Facebook, chaîne WhatsApp et YouTube.
        sameAs: [...footer.socials.map((social) => social.href), site.youtube].filter((url) => /^https?:\/\//.test(url)),
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
        description: brandIdentity,
        url: absoluteUrl("/"),
        inLanguage: "fr-CM",
        publisher: { "@id": absoluteUrl("/#organisation") },
        // Recherche de produits et de vendeurs de la marketplace.
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/recherche")}?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}
