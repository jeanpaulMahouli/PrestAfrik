import type { Metadata } from "next";
import { Suspense } from "react";
import { fontVariables } from "@/lib/fonts";
import { NavigationLoadingIndicator } from "@/components/ui/navigation-loading-indicator";
import "./globals.css";

export const metadata: Metadata = {
  // Adresse publique : les images de partage (Open Graph) des articles du blog pointent vers le vrai domaine.
  metadataBase: new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
  title: {
    default: "PrestAfrik",
    template: "%s | PrestAfrik",
  },
  description: "Crée ta boutique, reçois tes commandes et fais-les confirmer par tes clients.",
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
