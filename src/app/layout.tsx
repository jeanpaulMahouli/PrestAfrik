import type { Metadata } from "next";
import { Suspense } from "react";
import { fontVariables } from "@/lib/fonts";
import { NavigationLoadingIndicator } from "@/components/ui/navigation-loading-indicator";
import { sharePreviewImage } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  // Adresse publique : les images de partage (Open Graph) des articles du blog pointent vers le vrai domaine.
  metadataBase: new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
  title: {
    default: "PrestAfrik",
    template: "%s | PrestAfrik",
  },
  description:
    "PrestAfrik : créez gratuitement votre boutique en ligne en 5 minutes. Commandes sur WhatsApp, paiement à la livraison, au Cameroun et en Afrique.",
  applicationName: "PrestAfrik",
  keywords: ["PrestAfrik", "boutique en ligne", "créer une boutique en ligne", "vendre sur WhatsApp", "e-commerce Cameroun", "paiement à la livraison", "Afrique", "Douala", "Yaoundé"],
  // Aperçu des liens partagés (WhatsApp, Facebook, LinkedIn…) ; une boutique ou un produit le remplace par ses images.
  openGraph: {
    type: "website",
    siteName: "PrestAfrik",
    locale: "fr_FR",
    images: [sharePreviewImage],
  },
  twitter: { card: "summary_large_image" },
  // Code de validation Google Search Console (balise HTML), facultatif si le domaine est validé par DNS.
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
  // Icônes déclarées ici (et non par fichiers dans src/app) : chaque boutique peut les remplacer par son logo.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/brand/apple-icon.png", sizes: "180x180" },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={fontVariables} lang="fr">
      <body>
        {children}
        <Suspense fallback={null}>
          <NavigationLoadingIndicator />
        </Suspense>
      </body>
    </html>
  );
}
