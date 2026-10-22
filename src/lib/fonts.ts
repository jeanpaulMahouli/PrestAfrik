import localFont from "next/font/local";

// Polices du design system PrestAfrik (landing page et espace vendeur), exposées en variables CSS :
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
  fallback: ["system-ui", "sans-serif"],
});
export const fontDisplay = localFont({
  src: [{ path: "../../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2", weight: "700", style: "normal" }],
  variable: "--lp-font-display",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});
export const fontUi = localFont({
  src: [
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--lp-font-ui",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

/** Classes à poser sur le conteneur d'une page pour rendre les trois variables disponibles. */
export const fontVariables = `${fontText.variable} ${fontDisplay.variable} ${fontUi.variable}`;
