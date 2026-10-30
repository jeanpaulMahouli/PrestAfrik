"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Rangée défilante (glisser au doigt, flèches sur ordinateur) : produits ou boutiques. */
export function ScrollRail({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const rail = ref.current;
    if (!rail) return;
    const update = () => setEdges({ start: rail.scrollLeft < 8, end: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8 });
    update();
    rail.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      rail.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scroll = (direction: number) => ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.85, behavior: "smooth" });

  return (
    <div className="shop-rail">
      <ul aria-label={label} className="shop-rail-track" ref={ref}>
        {children}
      </ul>
      <button aria-label="Précédent" className="shop-rail-arrow shop-rail-arrow--prev" disabled={edges.start} onClick={() => scroll(-1)} type="button">
        <ChevronLeft aria-hidden="true" size={20} />
      </button>
      <button aria-label="Suivant" className="shop-rail-arrow shop-rail-arrow--next" disabled={edges.end} onClick={() => scroll(1)} type="button">
        <ChevronRight aria-hidden="true" size={20} />
      </button>
    </div>
  );
}

const pad = (value: number) => String(value).padStart(2, "0");

/** Compte à rebours des ventes flash (jours, heures, minutes, secondes) jusqu'à la date choisie par l'administration. */
export function FlashCountdown({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt).getTime();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [end]);

  // Rendu serveur : pas d'heure affichée (elle différerait de celle du navigateur).
  const seconds = left === null ? null : Math.floor(left / 1000);
  const parts =
    seconds === null
      ? ["--", "--", "--", "--"]
      : [Math.floor(seconds / 86400), Math.floor((seconds % 86400) / 3600), Math.floor((seconds % 3600) / 60), seconds % 60].map(pad);
  const labels = ["j", "h", "min", "s"];
  return (
    <p aria-label={seconds === null ? "Fin de la vente flash" : `Fin dans ${parts[0]} jours ${parts[1]} heures ${parts[2]} minutes`} className="shop-countdown" role="timer">
      <span className="shop-countdown-label">Se termine dans</span>
      {parts.map((part, index) =>
        index === 0 && part === "00" ? null : (
          <span aria-hidden="true" className="shop-countdown-cell" key={labels[index]}>
            <strong>{part}</strong>
            <small>{labels[index]}</small>
          </span>
        ),
      )}
    </p>
  );
}
