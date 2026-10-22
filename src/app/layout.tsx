import type { Metadata } from "next";
import { Suspense } from "react";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import { NavigationLoadingIndicator } from "@/components/ui/navigation-loading-indicator";
import "./globals.css";

export const metadata: Metadata = {
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
    <html lang="fr">
      <body>
        {children}
        <Suspense fallback={null}>
          <NavigationLoadingIndicator />
        </Suspense>
      </body>
    </html>
  );
}
