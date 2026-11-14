"use client";

import { ChevronLeft, ChevronRight } from "@/components/ui/icons";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Rangée horizontale à défilement natif (scroll-snap). Flèches sur ordinateur, seulement quand la rangée
 * dépasse la largeur affichée : « précédent » cachée au début, « suivant » cachée à la fin.
 */
export function PromoRail({ label, children }: { label: string; children: ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [state, setState] = useState({ overflow: false, start: true, end: false });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => {
      const overflow = list.scrollWidth - list.clientWidth > 4;
      setState({ overflow, start: list.scrollLeft <= 4, end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 4 });
    };
    update();
    list.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => {
      list.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const scroll = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({ left: direction * list.clientWidth * 0.85, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className={`sf-rail${state.overflow ? " has-overflow" : ""}${state.start ? " at-start" : ""}${state.end ? " at-end" : ""}`}>
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
