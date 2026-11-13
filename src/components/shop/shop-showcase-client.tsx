"use client";

import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Diaporama de la grande vitrine (héros) : 6 s par vitrine, pause au survol et au clavier, glisser au
 * doigt. Les vitrines sont rendues côté serveur ; seule la vitrine visible est accessible.
 */
export function SpotlightCarousel({ slides, label }: { slides: { id: string; node: ReactNode }[]; label: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(0);
  const count = slides.length;

  useEffect(() => {
    if (count < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % count), 6000);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  const go = (next: number) => setIndex((next + count) % count);

  return (
    <div
      aria-label={label}
      aria-roledescription="diaporama"
      className="sx-spotlight"
      onBlur={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchEnd={(event) => {
        const dx = event.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
      onTouchStart={(event) => (touchX.current = event.touches[0].clientX)}
      role="region"
    >
      <div className="sx-spotlight-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((slide, position) => (
          <div aria-hidden={position !== index} aria-label={`${position + 1} sur ${count}`} aria-roledescription="diapositive" className="sx-spotlight-slide" inert={position !== index} key={slide.id} role="group">
            {slide.node}
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="sx-spotlight-nav">
          <button aria-label="Vitrine précédente" onClick={() => go(index - 1)} type="button">
            <ArrowLeft aria-hidden="true" size={20} />
          </button>
          <div className="sx-spotlight-dots">
            {slides.map((slide, position) => (
              <button aria-current={position === index} aria-label={`Afficher la vitrine ${position + 1}`} key={slide.id} onClick={() => go(position)} type="button" />
            ))}
          </div>
          <button aria-label="Vitrine suivante" onClick={() => go(index + 1)} type="button">
            <ArrowRight aria-hidden="true" size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Bloc à onglets (« Produits phares ») : un onglet par catégorie, motif « tabs » ARIA (flèches gauche et
 * droite). Tous les panneaux sont rendus côté serveur ; seul l'onglet choisi est affiché.
 */
export function ShowcaseTabs({ title, titleId, tabs, more }: { title: string; titleId: string; tabs: { id: string; label: string; href: string; panel: ReactNode }[]; more: string }) {
  const [current, setCurrent] = useState(0);
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const select = (next: number) => {
    const value = (next + tabs.length) % tabs.length;
    setCurrent(value);
    refs.current[value]?.focus();
  };

  return (
    <div className="sx-tabs">
      <header className="sx-head">
        <h2 id={titleId}>{title}</h2>
        {tabs.length > 1 && (
          <div aria-labelledby={titleId} className="sx-tablist" role="tablist">
            {tabs.map((tab, position) => (
              <button
                aria-controls={`${base}-${tab.id}`}
                aria-selected={position === current}
                id={`${base}-tab-${tab.id}`}
                key={tab.id}
                onClick={() => setCurrent(position)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") select(current + 1);
                  if (event.key === "ArrowLeft") select(current - 1);
                }}
                ref={(element) => {
                  refs.current[position] = element;
                }}
                role="tab"
                tabIndex={position === current ? 0 : -1}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        <a className="sx-link" href={tabs[current]?.href ?? more}>
          Voir tous les produits <ArrowRight aria-hidden="true" size={18} />
        </a>
      </header>
      {tabs.map((tab, position) => (
        <div aria-labelledby={`${base}-tab-${tab.id}`} className="sx-tabpanel" hidden={position !== current} id={`${base}-${tab.id}`} key={tab.id} role="tabpanel">
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
