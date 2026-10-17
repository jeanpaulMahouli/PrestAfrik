"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { testimonials } from "./content";
import { ArrowIcon, StarIcon } from "./icons";
import { Reveal } from "./reveal";

const AUTOPLAY_MS = 10_000;
const SWAP_MS = 380;

/**
 * Carrousel de témoignages : la carte centrale est mise en avant, ses voisines dépassent sur les côtés (grand écran).
 * Défilement automatique toutes les 10 s, en pause au survol ; flèches, clavier et glissé sur mobile.
 */
export function Testimonials() {
  const items = testimonials.items;
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<"idle" | "out-up" | "out-down" | "in-up" | "in-down">("idle");
  const [paused, setPaused] = useState(false);
  const busy = useRef(false);
  const touchX = useRef(0);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (busy.current) return;
      busy.current = true;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setPhase(dir > 0 ? "out-up" : "out-down");
      window.setTimeout(
        () => {
          setCurrent((c) => (c + dir + items.length) % items.length);
          setPhase(dir > 0 ? "in-up" : "in-down");
          // Deux images plus tard, on relâche : le contenu glisse vers sa place.
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              setPhase("idle");
              window.setTimeout(() => (busy.current = false), SWAP_MS);
            }),
          );
        },
        reduce ? 0 : SWAP_MS,
      );
    },
    [items.length],
  );

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => step(1), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, step, current]);

  const visible = [-1, 0, 1].map((offset) => ({ offset, item: items[(current + offset + items.length) % items.length] }));

  return (
    <section aria-labelledby="testimonials-title" className="lp-section lp-testimonials" id="temoignages">
      <span aria-hidden="true" className="lp-glow lp-glow--left" />
      <Reveal as="h2" className="lp-title lp-title--display" id="testimonials-title">
        {testimonials.title}
      </Reveal>

      <div
        aria-roledescription="carrousel"
        className={`lp-testimonials__track is-${phase}`}
        onBlur={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
        }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      >
        {visible.map(({ offset, item }) => (
          <figure aria-hidden={offset !== 0} className={`lp-quote${offset === 0 ? " is-current" : ""}`} key={offset}>
            <div className="lp-quote__body">
              <Image alt="" className="lp-quote__photo" height={107} src={item.photo} width={107} />
              <figcaption>
                <strong className="lp-quote__name">{item.name}</strong>
                <span className="lp-quote__role">{item.role}</span>
              </figcaption>
              <blockquote className="lp-quote__text">{item.text}</blockquote>
              <div aria-label={`${item.rating} étoiles sur 5`} className="lp-quote__stars" role="img">
                {Array.from({ length: item.rating }, (_, i) => (
                  <StarIcon key={i} />
                ))}
              </div>
            </div>
          </figure>
        ))}
      </div>

      <div className="lp-testimonials__nav">
        <button aria-label="Témoignage précédent" className="lp-arrow" onClick={() => step(-1)} type="button">
          <ArrowIcon direction="left" />
        </button>
        <button aria-label="Témoignage suivant" className="lp-arrow" onClick={() => step(1)} type="button">
          <ArrowIcon />
        </button>
      </div>
    </section>
  );
}
