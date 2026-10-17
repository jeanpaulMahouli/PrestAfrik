"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useDismiss } from "@/components/ui/use-dismiss";
import { authLinks, navLinks } from "./content";
import { MenuIcon } from "./icons";

/** Barre de navigation : liens sur grand écran, menu déroulant sur mobile et tablette. */
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const login = signedIn ? authLinks.dashboard : authLinks.login;
  const signup = signedIn ? authLinks.dashboard : authLinks.signup;

  // Ferme le menu au clic en dehors (bouton et menu compris dans l'en-tête) et avec Échap.
  const close = useCallback(() => setOpen(false), []);
  const headerRef = useDismiss<HTMLElement>(open, close);

  return (
    <header className="lp-header" ref={headerRef}>
      <nav aria-label="Navigation principale" className="lp-nav">
        <button
          aria-controls="lp-mobile-menu"
          aria-expanded={open}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="lp-nav__burger"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          <MenuIcon open={open} />
        </button>

        <Link aria-label="PrestAfrik, accueil" className="lp-nav__logo" href="/">
          <Image alt="PrestAfrik" height={65} priority src="/brand/logo-prestafrik.png" width={118} />
        </Link>

        <ul className="lp-nav__links">
          {navLinks.map((link, i) => (
            <li key={link.label}>
              <a aria-current={i === 0 ? "page" : undefined} href={link.href}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="lp-nav__actions">
          {!signedIn && (
            <Link className="lp-nav__btn lp-nav__btn--outline" href={login.href}>
              {login.label}
            </Link>
          )}
          <Link className="lp-nav__btn lp-nav__btn--solid" href={signup.href}>
            {signup.label}
          </Link>
        </div>
      </nav>

      <div className={`lp-menu${open ? " is-open" : ""}`} id="lp-mobile-menu">
        {navLinks.map((link) => (
          <a href={link.href} key={link.label} onClick={() => setOpen(false)}>
            {link.label}
          </a>
        ))}
        {!signedIn && <Link href={login.href}>{login.label}</Link>}
        <Link className="lp-menu__cta" href={signup.href}>
          {signup.label}
        </Link>
      </div>
    </header>
  );
}
