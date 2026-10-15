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
