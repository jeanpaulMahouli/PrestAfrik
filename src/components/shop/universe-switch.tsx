"use client";

import { Building2, Handshake, ShoppingBag, X, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { shopUniverseCookie, shopUniverseKeys, shopUniverses, type ShopUniverse } from "@/config/marketplace";

export const universeIcons: Record<ShopUniverse, LucideIcon> = { vente: ShoppingBag, immobilier: Building2, services: Handshake };

function choose(universe: ShopUniverse, home: string) {
  document.cookie = `${shopUniverseCookie}=${universe}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.location.assign(home);
}

/** Onglets « Vente & boutiques », « Immobilier », « Services » : changer d'univers à tout moment. */
export function UniverseTabs({ current, home }: { current: ShopUniverse; home: string }) {
  return (
    <nav aria-label="Univers" className="shop-universes">
      {shopUniverseKeys.map((key) => {
        const Icon = universeIcons[key];
        return (
          <button aria-current={key === current ? "page" : undefined} key={key} onClick={() => key !== current && choose(key, home)} type="button">
            <Icon aria-hidden="true" size={18} />
            <span>{shopUniverses[key].label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Fenêtre d'accueil, à la première visite : « Que recherchez-vous ? » — trois grandes cartes illustrées.
 * Le choix est gardé ; les onglets d'univers permettent d'en changer ensuite.
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
        <p className="shop-welcome-kicker">Bienvenue sur PrestAfrik Shop{city ? ` · ${city}` : ""}</p>
        <h2 id="shop-welcome-title">Que recherchez-vous aujourd’hui ?</h2>
        <ul className="shop-welcome-choices">
          {shopUniverseKeys.map((key) => {
            const Icon = universeIcons[key];
            return (
              <li key={key}>
                <button autoFocus={key === "vente"} className={`shop-welcome-choice shop-welcome-choice--${key}`} onClick={() => choose(key, home)} type="button">
                  <span aria-hidden="true" className="shop-welcome-icon">
                    <Icon size={30} strokeWidth={1.8} />
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
