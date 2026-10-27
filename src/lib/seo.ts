// Référencement : image de partage, adresses absolues et données structurées (schema.org) lues par Google.
import { appBaseUrl } from "@/lib/urls";

/** Image d'aperçu du site (WhatsApp, Facebook, Google…) : 1640 × 856. */
export const sharePreviewImage = { url: "/brand/apercu-prestafrik.jpg", width: 1640, height: 856, alt: "PrestAfrik — votre boutique en ligne" };

/** Adresse complète d'un fichier ou d'une page (« /media/… » → « https://prestafrik.com/media/… »). */
export function absoluteUrl(pathOrUrl: string) {
  return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${appBaseUrl()}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** Contenu d'une balise <script type="application/ld+json"> : « < » échappé pour ne jamais fermer la balise. */
export function jsonLd(data: Record<string, unknown>) {
  return { __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c") };
}
