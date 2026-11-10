"use client";

import { ArrowRight } from "@phosphor-icons/react/ssr";
import { useEffect, useState } from "react";

export type TickerItem = { id: string; text: string; linkUrl: string | null };

/**
 * Espace publicitaire en haut de la marketplace : un texte à la fois, centré, toutes les 4 secondes
 * (réglable dans l'administration) ; il entre par le bas et sort par le haut, en boucle. Un texte avec un
 * lien porte le bouton « J’en profite ». Textes gérés dans Administration → Marketplace.
 */
export function ShopTicker({ items, seconds = 4 }: { items: TickerItem[]; seconds?: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % count), seconds * 1000);
    return () => window.clearInterval(timer);
  }, [count, paused, seconds]);

  if (!count) return null;
  const item = items[index];
  const external = item.linkUrl ? /^https?:\/\//.test(item.linkUrl) && !item.linkUrl.includes("prestafrik") : false;

  return (
    <div aria-label="Annonces" className="shop-ticker" style={{ "--ticker-duration": `${seconds}s` } as React.CSSProperties} onBlur={() => setPaused(false)} onFocus={() => setPaused(true)} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} role="region">
      <span aria-live="polite" className="shop-ticker-window">
        {/* La clé change à chaque texte : l'animation d'entrée est rejouée. */}
        <span className={`shop-ticker-item${count === 1 ? " is-single" : ""}`} key={`${item.id}-${index}`}>
          {item.linkUrl ? (
            <a href={item.linkUrl} rel={external ? "noopener noreferrer" : undefined} target={external ? "_blank" : undefined}>
              <span>{item.text}</span>
              <span className="sx-adbar-cta">
                J’en profite <ArrowRight aria-hidden="true" size={16} />
              </span>
            </a>
          ) : (
            <span>{item.text}</span>
          )}
        </span>
      </span>
    </div>
  );
}
