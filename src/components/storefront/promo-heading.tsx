import { Sparkles, Tag, Zap } from "lucide-react";
import type { ReactNode } from "react";

// Titre de la rangée « Promotions ». Les libellés et icônes de chaque style sont tous rendus et le style
// choisi (classe sf-promo-… de la vitrine) n'en montre qu'un : l'aperçu de « Ma boutique » change de style
// sans recharger la page.

const labels = [
  { style: "classique", text: "Promotions" },
  { style: "vente-flash", text: "Ventes flash" },
  { style: "offres-du-jour", text: "Offres du jour" },
  { style: "eclat", text: "Promos en or" },
] as const;

export function PromoHeading({
  id,
  level = 2,
  count,
  maxDiscount,
  action,
}: {
  id: string;
  level?: 1 | 2;
  count: number;
  maxDiscount: number;
  /** Lien « Tout voir » (accueil) ou retour (page Promotions). */
  action?: ReactNode;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <header className="sf-home-section-head sf-promo-head">
      <span aria-hidden="true" className="sf-promo-icon">
        <Zap className="sf-promo-icon-vente-flash" size={20} strokeWidth={2.4} />
        <Tag className="sf-promo-icon-offres-du-jour" size={18} strokeWidth={2.4} />
        <Sparkles className="sf-promo-icon-eclat" size={20} strokeWidth={2.2} />
      </span>
      <span className="sf-promo-heading">
        <Heading id={id}>
          {labels.map((label) => (
            <span className={`sf-promo-label sf-promo-label-${label.style}`} key={label.style}>
              {label.text}
            </span>
          ))}
        </Heading>
        <small className="sf-promo-sub">
          {maxDiscount > 0 && <strong>Jusqu’à -{maxDiscount} %</strong>}
          {maxDiscount > 0 && " · "}
          {count} produit{count > 1 ? "s" : ""} à prix réduit
        </small>
      </span>
      {action}
    </header>
  );
}
