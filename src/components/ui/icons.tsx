// Icônes communes (couleur héritée du texte). Décoratives : le texte voisin ou un aria-label porte le sens.

type IconProps = { size?: number; className?: string };

/** Coche (maquettes : check-mark-1.svg). */
export function CheckIcon({ size = 14, className }: IconProps) {
  return (
    <svg aria-hidden="true" className={`icon ${className ?? ""}`} fill="currentColor" focusable="false" height={size} viewBox="0 0 24 24" width={size}>
      <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z" />
    </svg>
  );
}

/** Flèche de retour (svgrepo « left-direction-arrow »). */
export function BackIcon({ size = 16, className }: IconProps) {
  return (
    <svg aria-hidden="true" className={`icon ${className ?? ""}`} fill="currentColor" focusable="false" height={size} viewBox="0 0 34.075 34.075" width={size}>
      <path d="M24.57 34.075c-.505 0-1.011-.191-1.396-.577L8.11 18.432c-.771-.771-.771-2.019 0-2.79L23.174.578c.771-.771 2.02-.771 2.791 0s.771 2.02 0 2.79l-13.67 13.669 13.67 13.669c.771.771.771 2.021 0 2.792-.385.385-.89.577-1.395.577z" />
    </svg>
  );
}
