import localFont from "next/font/local";

// Polices du design system PrestAfrik, exposées en variables CSS pour tout le site (boutiques comprises) :
// Poppins pour l'interface et les titres, DM Sans pour les textes, Inter pour les grands titres.
// Fichiers servis depuis les paquets @fontsource (ADR-004) : le build ne dépend plus de Google Fonts,
// dont la réponse variait selon le serveur de build (échec « Cannot read properties of null » dans next/font).
export const fontText = localFont({
  src: [
    { path: "../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--lp-font-text",
  display: "swap",
  // Textes du site public seulement : téléchargée à la demande, jamais préchargée.
  preload: false,
  fallback: ["system-ui", "sans-serif"],
});
export const fontDisplay = localFont({
  src: [{ path: "../../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2", weight: "700", style: "normal" }],
  variable: "--lp-font-display",
  display: "swap",
  preload: false,
  fallback: ["system-ui", "sans-serif"],
});
export const fontUi = localFont({
  src: [
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--lp-font-ui",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

/** Classes posées sur <html> (app/layout.tsx) : les trois variables sont disponibles partout. */
export const fontVariables = `${fontText.variable} ${fontDisplay.variable} ${fontUi.variable}`;
