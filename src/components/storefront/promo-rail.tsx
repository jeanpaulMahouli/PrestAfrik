"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type ReactNode } from "react";

/** Rangée horizontale à défilement natif (scroll-snap) ; flèches sur ordinateur. */
export function PromoRail({ label, children }: { label: string; children: ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);
  const scroll = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({ left: direction * list.clientWidth * 0.85, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className="sf-rail">
      <button aria-label={`${label} : produits précédents`} className="sf-rail-arrow sf-rail-prev" onClick={() => scroll(-1)} type="button">
        <ChevronLeft aria-hidden="true" size={20} />
      </button>
      <ul aria-label={label} className="sf-rail-list" ref={listRef}>
        {children}
      </ul>
      <button aria-label={`${label} : produits suivants`} className="sf-rail-arrow sf-rail-next" onClick={() => scroll(1)} type="button">
        <ChevronRight aria-hidden="true" size={20} />
      </button>
    </div>
  );
}
