"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { StoreImage } from "@/components/ui/store-image";

export type BannerSlide = { id: string; imageUrl: string; altText: string; href: string | null };

const intervalMs = 5000;

/**
 * Diaporama sous la recherche : image suivante toutes les 5 s, en boucle. Pause au survol, au focus et
 * pendant un appui ; glissement gauche/droite sur mobile, flèches sur ordinateur, points en bas.
 * Sans défilement automatique si le visiteur a demandé moins d'animations.
 */
export function BannerCarousel({ slides }: { slides: BannerSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const count = slides.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    const timer = window.setTimeout(() => go(index + 1), intervalMs);
    return () => window.clearTimeout(timer);
  }, [count, paused, reducedMotion, index, go]);

  if (count === 0) return null;
  const multiple = count > 1;

  return (
    <section
      aria-label="Bannière de la boutique"
      aria-roledescription="carrousel"
      className="sf-banner"
      onBlur={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchCancel={() => {
        touchStart.current = null;
        setPaused(false);
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        setPaused(false);
        if (!start || !multiple) return;
        const dx = event.changedTouches[0].clientX - start.x;
        const dy = event.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1));
      }}
      onTouchStart={(event) => {
        touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        setPaused(true);
      }}
    >
      <div className="sf-banner-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((slide, position) => {
          const image = (
            <StoreImage
              alt={slide.altText}
              fill
              priority={position === 0}
              sizes="(max-width: 1152px) 100vw, 1152px"
              src={slide.imageUrl}
            />
          );
          return (
            <div
              aria-hidden={position !== index}
              aria-label={multiple ? `Image ${position + 1} sur ${count}` : undefined}
              aria-roledescription={multiple ? "diapositive" : undefined}
              className="sf-banner-slide"
              key={slide.id}
              role={multiple ? "group" : undefined}
            >
              {slide.href ? (
                <Link className="sf-banner-link" href={slide.href} tabIndex={position === index ? undefined : -1}>
                  {image}
                </Link>
              ) : (
                image
              )}
            </div>
          );
        })}
      </div>
      {multiple && (
        <>
          <button aria-label="Image précédente" className="sf-banner-arrow sf-banner-prev" onClick={() => go(index - 1)} type="button">
            <ChevronLeft aria-hidden="true" size={22} />
          </button>
          <button aria-label="Image suivante" className="sf-banner-arrow sf-banner-next" onClick={() => go(index + 1)} type="button">
            <ChevronRight aria-hidden="true" size={22} />
          </button>
          <div className="sf-banner-dots">
            {slides.map((slide, position) => (
              <button
                aria-current={position === index ? "true" : undefined}
                aria-label={`Afficher l’image ${position + 1}`}
                key={slide.id}
                onClick={() => go(position)}
                type="button"
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
