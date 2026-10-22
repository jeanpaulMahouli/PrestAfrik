"use client";

import Image from "next/image";
import { useRef, useState, type CSSProperties } from "react";
import { LandingButton } from "./buttons";
import { clientSide } from "./content";
import { Reveal } from "./reveal";

/** « Côté client » : chaque étape affiche l'écran correspondant dans le téléphone (clic, clavier ou glissé sur mobile). */
export function ClientShowcase({ signedIn }: { signedIn: boolean }) {
  const [active, setActive] = useState(0);
  const touchX = useRef(0);
  const steps = clientSide.steps;
  const go = (i: number) => setActive(Math.max(0, Math.min(steps.length - 1, i)));

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

      <div className="lp-client__card">
        {/* Fond découpé à l'arrondi de la carte ; le téléphone, lui, peut déborder. */}
        <span aria-hidden="true" className="lp-client__bg">
          <span className="lp-client__rings" />
        </span>

        <div
          className="lp-client__steps"
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1));
          }}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          role="tablist"
          style={{ "--step": active } as CSSProperties}
        >
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
          {steps.map((step, i) => (
            <Image
              alt={i === active ? `Écran « ${step.label} » sur téléphone` : ""}
              className={`lp-client__phone${i === active ? " is-active" : ""}`}
              height={2217}
              key={step.image}
              sizes="(max-width: 767px) 60vw, 360px"
              src={step.image}
              width={1068}
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
