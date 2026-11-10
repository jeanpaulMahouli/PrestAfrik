"use client";

import type { Icon } from "@phosphor-icons/react";
import { Buildings, CaretDown, Check, Handshake, ShoppingBag, X } from "@phosphor-icons/react/ssr";
import { useEffect, useRef, useState } from "react";
import { useMenuTop } from "./use-menu-top";
import { shopUniverseCookie, shopUniverseKeys, shopUniverses, type ShopUniverse } from "@/config/marketplace";

export const universeIcons: Record<ShopUniverse, Icon> = { vente: ShoppingBag, immobilier: Buildings, services: Handshake };

function choose(universe: ShopUniverse, home: string) {
  document.cookie = `${shopUniverseCookie}=${universe}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.location.assign(home);
}

/**
 * Univers (Shopping, Immobilier, Services) : menu déroulant de l'en-tête, avant « Devenir vendeur ».
 * Se ferme au clic à l'extérieur et avec Échap.
 */
export function UniverseMenu({ current, home }: { current: ShopUniverse; home: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useMenuTop(open);
  const CurrentIcon = universeIcons[current];

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="sx-universe" ref={ref}>
      <button aria-controls="sx-universe-list" aria-expanded={open} aria-label={`Univers : ${shopUniverses[current].label}`} className="sx-universe-button" onClick={() => setOpen((value) => !value)} ref={buttonRef} type="button">
        <CurrentIcon aria-hidden="true" size={20} />
        <span>{shopUniverses[current].label}</span>
        <CaretDown aria-hidden="true" className="sx-caret" size={14} />
      </button>
      <ul className="sx-universe-list" hidden={!open} id="sx-universe-list">
        {shopUniverseKeys.map((key) => {
          const Icon = universeIcons[key];
          return (
            <li key={key}>
              <button aria-current={key === current ? "true" : undefined} onClick={() => (key === current ? setOpen(false) : choose(key, home))} type="button">
                <Icon aria-hidden="true" size={22} />
                <span>
                  <strong>{shopUniverses[key].label}</strong>
                  <small>{shopUniverses[key].text}</small>
                </span>
                {key === current && <Check aria-hidden="true" className="sx-universe-check" size={16} />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Fenêtre d'accueil, à la première visite : « Que recherchez-vous ? » — trois grandes cartes illustrées.
 * Le choix est gardé ; le menu des univers de l'en-tête permet d'en changer ensuite.
 */
export function UniverseWelcome({ home, city }: { home: string; city: string | null }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(true), []);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && choose("vente", home);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, home]);
  if (!open) return null;

  return (
    <div className="shop-welcome-layer">
      <div aria-hidden="true" className="shop-welcome-backdrop" />
      <div aria-labelledby="shop-welcome-title" aria-modal="true" className="shop-welcome" role="dialog">
        <button aria-label="Fermer et voir les boutiques" className="shop-welcome-close" onClick={() => choose("vente", home)} type="button">
          <X aria-hidden="true" size={20} />
        </button>
        <p className="shop-welcome-kicker">Bienvenue sur PrestAfrik{city ? ` · ${city}` : ""}</p>
        <h2 id="shop-welcome-title">Que recherchez-vous aujourd’hui ?</h2>
        <ul className="shop-welcome-choices">
          {shopUniverseKeys.map((key) => {
            const Icon = universeIcons[key];
            return (
              <li key={key}>
                <button autoFocus={key === "vente"} className={`shop-welcome-choice shop-welcome-choice--${key}`} onClick={() => choose(key, home)} type="button">
                  <span aria-hidden="true" className="shop-welcome-icon">
                    <Icon size={30} />
                  </span>
                  <strong>{shopUniverses[key].label}</strong>
                  <small>{shopUniverses[key].text}</small>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="shop-welcome-note">Vous pourrez changer à tout moment, en haut de la page.</p>
      </div>
    </div>
  );
}

/** Bouton qui change d'univers (ex. « Voir le Shopping » quand l'univers choisi n'a pas encore d'annonces). */
export function UniverseSwitchButton({ to, home, className, children }: { to: ShopUniverse; home: string; className?: string; children: React.ReactNode }) {
  return (
    <button className={className} onClick={() => choose(to, home)} type="button">
      {children}
    </button>
  );
}
