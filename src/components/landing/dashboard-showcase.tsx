"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { dashboard } from "./content";
import { Reveal } from "./reveal";

/**
 * Tableau de bord : la capture change selon la carte active.
 * Grand écran : la carte active suit la progression du défilement (ou un clic).
 * Mobile/tablette : la capture reste collée en haut de l'écran et la carte la plus proche devient active.
 */
export function DashboardShowcase() {
  const [active, setActive] = useState(0);
  const cardsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const frameRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<{ index: number; y: number } | null>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    let frame = 0;

    const update = () => {
      frame = 0;
      const cards = cardsRef.current.filter((c): c is HTMLButtonElement => Boolean(c));
      if (!cards.length) return;
      const vh = window.innerHeight;

      // Après un clic, on garde le choix tant que l'utilisateur ne défile pas franchement.
      const lock = lockRef.current;
      if (lock) {
        if (Math.abs(window.scrollY - lock.y) < 160) return;
        lockRef.current = null;
      }

      if (desktop.matches) {
        const start = cards[0].getBoundingClientRect().top - 0.9 * vh;
        const end = cards[cards.length - 1].getBoundingClientRect().bottom - 0.3 * vh;
        const progress = Math.min(1, Math.max(0, -start / (end - start)));
        setActive(Math.min(cards.length - 1, Math.floor(progress * cards.length)));
        return;
      }

      const frameBottom = frameRef.current?.getBoundingClientRect().bottom ?? 0;
      const line = frameBottom + (vh - frameBottom) * 0.3;
      let best = 0;
      let bestDistance = Infinity;
      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const distance = Math.abs(r.top + r.height / 2 - line);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      setActive(best);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const pick = (index: number) => {
    lockRef.current = { index, y: window.scrollY };
    setActive(index);
  };

  return (
    <section aria-labelledby="dashboard-title" className="lp-section lp-dashboard" id="fonctionnalites">
      <span aria-hidden="true" className="lp-glow lp-glow--left" />
      <header className="lp-section__head">
        <Reveal as="h2" className="lp-title" id="dashboard-title">
          {dashboard.title}
        </Reveal>
        <Reveal as="p" className="lp-lead">
          {dashboard.subtitle}
        </Reveal>
      </header>

      <div className="lp-dashboard__frame" ref={frameRef}>
        {dashboard.features.map((feature, i) => (
          <Image
            alt={i === active ? `Aperçu : ${feature.title}` : ""}
            className={`lp-dashboard__shot${i === active ? " is-active" : ""}`}
            height={957}
            key={feature.image}
            priority={i === 0}
            sizes="(max-width: 1024px) 94vw, 1600px"
            src={feature.image}
            width={1595}
          />
        ))}
      </div>

      <div className="lp-dashboard__cards">
        {dashboard.features.map((feature, i) => (
          <button
            aria-pressed={i === active}
            className={`lp-feature${i === active ? " is-active" : ""}`}
            key={feature.title}
            onClick={() => pick(i)}
            ref={(el) => {
              cardsRef.current[i] = el;
            }}
            type="button"
          >
            {/* Un bouton ne peut contenir que du texte « en ligne » : titres et paragraphes sont des <span> mis en forme. */}
            <span className="lp-feature__title">{feature.title}</span>
            <span className="lp-feature__text">
              {feature.lead && <strong>{feature.lead}</strong>}
              {feature.text}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
