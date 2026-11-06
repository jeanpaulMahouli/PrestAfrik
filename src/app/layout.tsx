import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { fontVariables } from "@/lib/fonts";
import { KeyboardWatcher } from "@/components/ui/keyboard-watcher";
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
    "PrestAfrik : créez gratuitement votre boutique en ligne en 5 minutes. Commandes sur WhatsApp, paiement à la livraison, dans toute la zone CEMAC.",
  applicationName: "PrestAfrik",
  // Résultats Google détaillés : grande image, description complète et extraits vidéo autorisés.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  // Application installable (PWA) : public/manifest.webmanifest, ouverte sur le tableau de bord.
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PrestAfrik", statusBarStyle: "default" },
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
      // Logo PrestAfrik vectorisé (PrestAfrik maquettes UX UI/fav.jpg) : net à toutes les tailles.
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/brand/apple-icon.png", sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  themeColor: "#FF9900",
  // Écrans arrondis et barre de gestes : les marges env(safe-area-inset-*) des barres fixes deviennent réelles.
  viewportFit: "cover",
  // Clavier du téléphone : il recouvre la page au lieu de la rétrécir. Les barres fixées en bas (menu de
  // l'espace vendeur) restent à leur place, derrière le clavier, comme dans une application.
  interactiveWidget: "resizes-visual",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={fontVariables} lang="fr">
      <body>
        {children}
        <Suspense fallback={null}>
          <NavigationLoadingIndicator />
        </Suspense>
        <KeyboardWatcher />
      </body>
    </html>
  );
}
