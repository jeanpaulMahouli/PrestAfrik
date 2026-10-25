import "@/styles/app.css";

/** Charge seulement les styles de l’application (espace vendeur, assistant, administration). */
export default function AppStylesLayout({ children }: LayoutProps<"/dashboard">) {
  return children;
}
