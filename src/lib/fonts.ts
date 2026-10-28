import localFont from "next/font/local";

// Police unique de PrestAfrik : Poppins, partout (site public, connexion, tableau de bord, boutiques,
// fenêtres et messages). Fichiers servis depuis le paquet @fontsource (ADR-004) : le build ne dépend pas
// de Google Fonts, dont la réponse variait selon le serveur de build.
// Les anciennes variables (--lp-font-text, --lp-font-display) pointent aussi vers Poppins (globals.css) :
// aucune feuille de style ne peut réintroduire une autre police.
export const fontUi = localFont({
  src: [
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--lp-font-ui",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

/** Classe posée sur <html> (app/layout.tsx) : la variable de Poppins est disponible partout. */
export const fontVariables = fontUi.variable;
