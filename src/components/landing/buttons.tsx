import Link from "next/link";
import type { ReactNode } from "react";
import { SparklesIcon } from "./icons";

type ButtonProps = {
  href: string;
  children: ReactNode;
  /** primary : dégradé orange animé + étincelles. secondary : bouton blanc bordé. */
  variant?: "primary" | "secondary";
  icon?: ReactNode;
  className?: string;
};

/** Bouton-lien de la landing page. Les liens internes passent par next/link, les autres (#ancre, mailto:) restent des <a>. */
export function LandingButton({ href, children, variant = "primary", icon, className = "" }: ButtonProps) {
  const classes = `lp-btn lp-btn--${variant} ${className}`.trim();
  const content = (
    <>
      <span>{children}</span>
      {variant === "primary" ? <SparklesIcon className="lp-btn__sparkles" /> : icon}
    </>
  );
  return href.startsWith("/") ? (
    <Link className={classes} href={href}>
      {content}
    </Link>
  ) : (
    <a className={classes} href={href}>
      {content}
    </a>
  );
}
