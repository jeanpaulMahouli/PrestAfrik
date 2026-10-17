import { DM_Sans, Inter, Poppins } from "next/font/google";

// Polices du design system PrestAfrik (landing page et espace vendeur), exposées en variables CSS :
// Poppins pour l'interface et les titres, DM Sans pour les textes, Inter pour les grands titres.
export const fontText = DM_Sans({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--lp-font-text" });
export const fontDisplay = Inter({ subsets: ["latin"], weight: ["700"], variable: "--lp-font-display" });
export const fontUi = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--lp-font-ui" });

/** Classes à poser sur le conteneur d'une page pour rendre les trois variables disponibles. */
export const fontVariables = `${fontText.variable} ${fontDisplay.variable} ${fontUi.variable}`;
