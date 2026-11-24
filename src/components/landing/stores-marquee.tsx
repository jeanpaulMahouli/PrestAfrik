"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Vitesse du défilement automatique (pixels par seconde). */
const speed = 40;
/** Après une action du visiteur, le défilement automatique reprend au bout de ce délai. */
const resumeAfterMs = 2500;

/**
 * Bande de boutiques qui défile toute seule, et que le visiteur peut faire défiler lui-même : doigt, molette,
 * barre de défilement ou glisser-déposer à la souris. Pause au survol et pendant une action, reprise ensuite.
 * La liste est fournie deux fois (`children`) : arrivé à la moitié, on revient au début sans saut visible.
 * Sans défilement automatique si le visiteur a demandé moins d'animations.
 */
export function StoresMarquee({ children }: { children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = performance.now();
    let pausedUntil = 0;
    let hovering = false;
    let dragging: { x: number; left: number; moved: boolean } | null = null;
    // Position en virgule (scrollLeft est arrondi par le navigateur : sans cela, la bande n'avancerait pas).
    let position = element.scrollLeft;

    const wrap = () => {
      const half = element.scrollWidth / 2;
      if (half <= 0) return;
      if (element.scrollLeft >= half) element.scrollLeft -= half;
      else if (element.scrollLeft <= 0) element.scrollLeft += half;
      position = element.scrollLeft;
    };

    const tick = (now: number) => {
      const delta = Math.min(64, now - last);
      last = now;
      if (!reduced && !hovering && !dragging && now > pausedUntil && document.visibilityState === "visible") {
        position += (speed * delta) / 1000;
        element.scrollLeft = position;
        wrap();
      }
      frame = requestAnimationFrame(tick);
    };

    const pause = () => {
      pausedUntil = performance.now() + resumeAfterMs;
      position = element.scrollLeft;
    };
    const onScroll = () => {
      // Défilement par le visiteur (doigt, molette, barre) : on suit sa position et on boucle.
      if (Math.abs(element.scrollLeft - position) > 2) {
        pause();
        wrap();
      }
    };
    const onEnter = () => (hovering = true);
    const onLeave = () => {
      hovering = false;
      pause();
    };
    // Glisser-déposer à la souris (sur écran tactile, le défilement natif suffit).
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      dragging = { x: event.clientX, left: element.scrollLeft, moved: false };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const distance = event.clientX - dragging.x;
      if (Math.abs(distance) > 4) dragging.moved = true;
      element.scrollLeft = dragging.left - distance;
      element.classList.toggle("is-dragging", dragging.moved);
    };
    const onPointerUp = () => {
      if (!dragging) return;
      const moved = dragging.moved;
      dragging = null;
      pause();
      wrap();
      // Après un glisser, le clic qui suit n'ouvre pas la boutique.
      if (moved) {
        element.addEventListener("click", (event) => event.preventDefault(), { capture: true, once: true });
        requestAnimationFrame(() => element.classList.remove("is-dragging"));
      }
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    element.addEventListener("pointerenter", onEnter);
    element.addEventListener("pointerleave", onLeave);
    element.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    element.addEventListener("touchstart", pause, { passive: true });
    element.addEventListener("focusin", pause);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("scroll", onScroll);
      element.removeEventListener("pointerenter", onEnter);
      element.removeEventListener("pointerleave", onLeave);
      element.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("touchstart", pause);
      element.removeEventListener("focusin", pause);
    };
  }, []);

  return (
    <div aria-label="Boutiques PrestAfrik" className="lp-stores" ref={scroller} role="region" tabIndex={0}>
      {children}
    </div>
  );
}
