import "@/styles/storefront.css";
import "@/styles/storefront-merchandising.css";
import "@/styles/storefront-motion.css";
import "@/styles/storefront-promo.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aperçu de ma boutique", robots: { index: false, follow: false } };

/** Aperçu de la boutique en cours de création : mêmes feuilles de style que la vitrine publique. */
export default function DraftPreviewLayout({ children }: LayoutProps<"/apercu-boutique/[draftId]">) {
  return children;
}
