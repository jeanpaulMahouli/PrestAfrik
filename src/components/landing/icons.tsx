// Icônes de la landing page (SVG simples, couleur héritée via currentColor).
type IconProps = { className?: string };

/** Deux étincelles : utilisées sur les boutons principaux. */
export function SparklesIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 26 26">
      <path className="lp-sparkle-a" d="M8.3 9.6c.3-.9 1.6-.9 1.9 0l1.6 4.4c.1.3.3.5.6.6l4.4 1.6c.9.3.9 1.6 0 1.9l-4.4 1.6c-.3.1-.5.3-.6.6l-1.6 4.4c-.3.9-1.6.9-1.9 0l-1.6-4.4c-.1-.3-.3-.5-.6-.6L1.7 18c-.9-.3-.9-1.6 0-1.9l4.4-1.6c.3-.1.5-.3.6-.6l1.6-4.3Z" />
      <path className="lp-sparkle-b" d="M19.5 1.6c.3-.9 1.6-.9 1.9 0l.7 2c.1.3.3.5.6.6l2 .7c.9.3.9 1.6 0 1.9l-2 .7c-.3.1-.5.3-.6.6l-.7 2c-.3.9-1.6.9-1.9 0l-.7-2c-.1-.3-.3-.5-.6-.6l-2-.7c-.9-.3-.9-1.6 0-1.9l2-.7c.3-.1.5-.3.6-.6l.7-2Z" />
    </svg>
  );
}

/** Étoile à quatre branches (décor des sections orangées). */
export function TwinkleIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 32 32">
      <path d="M14.9 1c.2-1.3 2.1-1.3 2.4 0 1.2 7.1 6.8 12.7 13.9 13.9 1.3.2 1.3 2.2 0 2.4-7.1 1.2-12.7 6.8-13.9 13.9-.2 1.3-2.2 1.3-2.4 0C13.7 24.1 8.1 18.5 1 17.3c-1.3-.2-1.3-2.2 0-2.4C8.1 13.7 13.7 8.1 14.9 1Z" />
    </svg>
  );
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 23">
      <path d="M10.8.7c.3-.9 1.6-.9 1.9 0l2.1 6.5c.1.4.5.7 1 .7h6.8c1 0 1.4 1.2.6 1.8l-5.5 4c-.4.3-.5.7-.4 1.1l2.1 6.5c.3.9-.8 1.7-1.5 1.1l-5.5-4c-.4-.3-.8-.3-1.2 0l-5.5 4c-.8.6-1.8-.2-1.5-1.1l2.1-6.5c.1-.4 0-.9-.4-1.1L.4 9.6c-.8-.6-.4-1.8.6-1.8h6.8c.4 0 .8-.3 1-.7L10.8.7Z" />
    </svg>
  );
}

export function ArrowIcon({ className, direction = "right" }: IconProps & { direction?: "left" | "right" }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 38 32">
      {direction === "right" ? <path d="M21 1l16 15-16 15M37 16H1" /> : <path d="M17 1L1 16l16 15M1 16h36" />}
    </svg>
  );
}

/** Triangle plein pointant vers le bas (questions fréquentes). */
export function CaretIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 20 15">
      <path d="M9.2 14.6a1 1 0 0 0 1.6 0l9-13A1 1 0 0 0 19 0H1a1 1 0 0 0-.8 1.6l9 13Z" />
    </svg>
  );
}

export function MenuIcon({ open, className }: IconProps & { open: boolean }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}
