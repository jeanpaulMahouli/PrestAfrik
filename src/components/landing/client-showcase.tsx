"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LandingButton } from "./buttons";
import { clientSide } from "./content";
import { Reveal } from "./reveal";

/** Durée d'affichage de chaque écran avant le passage automatique au suivant. */
const slideMs = 4000;

/**
 * « Côté client » : chaque étape affiche l'écran correspondant dans le téléphone (clic, clavier, ou glissé sur
 * mobile, sur les étapes comme sur l'image). Les écrans défilent seuls, de droite à gauche, toutes les 4 secondes ;
 * un choix du visiteur relance les 4 secondes ; rien ne défile hors de l'écran ni quand le visiteur réduit les animations.
 */
export function ClientShowcase({ signedIn }: { signedIn: boolean }) {
  const [active, setActive] = useState(0);
  // Écrans téléchargés : l'écran affiché et le suivant (les autres arrivent quand on avance) ; auparavant
  // les quatre captures partaient d'emblée sur mobile.
  const [loaded, setLoaded] = useState(1);
  // Écran qui vient de partir : il sort par la gauche pendant que le nouveau arrive par la droite.
  const [previous, setPrevious] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  // Change à chaque choix du visiteur : relance le compte à rebours de 4 secondes.
  const [manualTick, setManualTick] = useState(0);
  const touchX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const steps = clientSide.steps;
  const show = (i: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, i));
    if (next === active) return;
    setPrevious(active);
    setActive(next);
    setLoaded((value) => Math.max(value, next + 1));
  };
  const go = (i: number) => {
    show(i);
    setManualTick((tick) => tick + 1);
  };

  // Défilement seulement quand la carte est à l'écran.
  useEffect(() => {
    const card = cardRef.current;
    if (!card || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => show(active === steps.length - 1 ? 0 : active + 1), slideMs);
    return () => window.clearTimeout(timer);
  }, [active, visible, manualTick, steps.length]);

  return (
    <section aria-labelledby="client-title" className="lp-section lp-client" id="demo">
      <span aria-hidden="true" className="lp-glow lp-glow--right" />
      <header className="lp-section__head">
        <Reveal as="h2" className="lp-title" id="client-title">
          {clientSide.title}
        </Reveal>
        <Reveal as="p" className="lp-lead">
          {clientSide.subtitle}
        </Reveal>
      </header>

      <div
        className="lp-client__card"
        ref={cardRef}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1));
        }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      >
        {/* Fond découpé à l'arrondi de la carte ; le téléphone, lui, peut déborder. */}
        <span aria-hidden="true" className="lp-client__bg">
          <span className="lp-client__rings" />
        </span>

        <div className="lp-client__steps" role="tablist" style={{ "--step": active } as CSSProperties}>
          {steps.map((step, i) => (
            <button
              aria-controls="client-phone"
              aria-selected={i === active}
              className={`lp-client__step${i === active ? " is-active" : ""}`}
              key={step.label}
              onClick={() => go(i)}
              role="tab"
              type="button"
            >
              <span aria-hidden="true" className="lp-client__dot" />
              {step.label}
            </button>
          ))}
        </div>

        <div className="lp-client__visual" id="client-phone" role="tabpanel">
          <span aria-hidden="true" className="lp-client__square lp-client__square--1" />
          <span aria-hidden="true" className="lp-client__square lp-client__square--2" />
          <span aria-hidden="true" className="lp-client__square lp-client__square--3" />
          {steps.slice(0, loaded + 1).map((step, i) => (
            <Image
              alt={i === active ? `Écran « ${step.label} » sur téléphone` : ""}
              className={`lp-client__phone${i === active ? " is-active" : i === previous ? " is-before" : ""}`}
              height={step.height}
              key={step.image}
              sizes="(max-width: 767px) 60vw, 360px"
              src={step.image}
              width={step.width}
            />
          ))}
        </div>
      </div>

      <div className="lp-center">
        <LandingButton href={signedIn ? "/dashboard" : clientSide.cta.href}>{clientSide.cta.label}</LandingButton>
      </div>
    </section>
  );
}
