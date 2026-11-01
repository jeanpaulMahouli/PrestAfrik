"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DashboardAnnouncement } from "@/modules/announcements/queries";

/** Emplacement sans image (pas encore de visuel dans l'administration) : fond aux couleurs et bouton seul. */
export type DrawnSlide = { id: string; cta: string; href: string; tone: "orange" | "navy" | "coral" };

type Slide = { kind: "image"; item: DashboardAnnouncement } | { kind: "drawn"; item: DrawnSlide };

function SlideLink({ href, children, className }: { href: string | null; children: React.ReactNode; className: string }) {
  if (!href) return <div className={className}>{children}</div>;
  const external = /^https?:\/\//.test(href) && !href.includes("prestafrik");
  return (
    <a className={className} href={href} rel={external ? "noopener noreferrer" : undefined} target={external ? "_blank" : undefined}>
      {children}
    </a>
  );
}

/** Une bannière : l'image (le texte est dans l'image) et son bouton ; à défaut d'image, le bouton seul. */
function Banner({ slide, className, priority = false }: { slide: Slide; className: string; priority?: boolean }) {
  if (slide.kind === "image") {
    return (
      <SlideLink className={className} href={slide.item.linkUrl}>
        {/* Images déjà converties en WebP au bon format à l'envoi. */}
        <img alt={slide.item.altText} decoding="async" fetchPriority={priority ? "high" : "auto"} loading={priority ? "eager" : "lazy"} src={slide.item.imageUrl} />
        {slide.item.linkUrl && <span className="shop-slide-cta">{slide.item.ctaLabel || "Découvrir"}</span>}
      </SlideLink>
    );
  }
  return (
    <SlideLink className={`${className} shop-slide--drawn shop-slide--${slide.item.tone}`} href={slide.item.href}>
      <span aria-hidden="true" className="shop-slide-shine" />
      <span className="shop-slide-cta">{slide.item.cta}</span>
    </SlideLink>
  );
}

/**
 * Haut de la marketplace. Ordinateur : grand diaporama (5 s par image, pause au survol) et deux visuels à
 * côté. Téléphone : une seule bannière rectangulaire, gérée à part. Visuels et boutons gérés dans
 * Administration → Annonces ; tant qu'il n'y a pas d'image, l'emplacement montre seulement son bouton.
 */
export function ShopHero({ carousel, banners, mobile, drawn, drawnBanners }: { carousel: DashboardAnnouncement[]; banners: DashboardAnnouncement[]; mobile: DashboardAnnouncement | null; drawn: DrawnSlide[]; drawnBanners: DrawnSlide[] }) {
  const slides: Slide[] = carousel.length ? carousel.map((item) => ({ kind: "image", item })) : drawn.map((item) => ({ kind: "drawn", item }));
  const sides: Slide[] = banners.length ? banners.map((item) => ({ kind: "image", item })) : drawnBanners.map((item) => ({ kind: "drawn", item }));
  const mobileSlide: Slide = mobile ? { kind: "image", item: mobile } : { kind: "drawn", item: drawn[0] };
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(0);
  const count = slides.length;

  useEffect(() => {
    if (count < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % count), 5000);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  const go = (next: number) => setIndex((next + count) % count);

  return (
    <>
      <section aria-label="À la une" className="shop-hero">
        <div
          aria-roledescription="diaporama"
          className="shop-carousel"
          onBlur={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchEnd={(event) => {
            const dx = event.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
          }}
          onTouchStart={(event) => (touchX.current = event.touches[0].clientX)}
        >
          <div className="shop-carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
            {slides.map((slide, position) => (
              <div aria-hidden={position !== index} aria-label={`${position + 1} sur ${count}`} aria-roledescription="diapositive" className="shop-carousel-slide" inert={position !== index} key={slide.item.id} role="group">
                <Banner className="shop-slide" priority={position === 0} slide={slide} />
              </div>
            ))}
          </div>
          {count > 1 && (
            <>
              <button aria-label="Diapositive précédente" className="shop-carousel-arrow shop-carousel-arrow--prev" onClick={() => go(index - 1)} type="button">
                <ChevronLeft aria-hidden="true" size={22} />
              </button>
              <button aria-label="Diapositive suivante" className="shop-carousel-arrow shop-carousel-arrow--next" onClick={() => go(index + 1)} type="button">
                <ChevronRight aria-hidden="true" size={22} />
              </button>
              <div className="shop-carousel-dots">
                {slides.map((slide, position) => (
                  <button aria-current={position === index} aria-label={`Afficher la diapositive ${position + 1}`} key={slide.item.id} onClick={() => go(position)} type="button" />
                ))}
              </div>
            </>
          )}
        </div>
        <div className="shop-hero-side">
          {sides.map((slide) => (
            <div className="shop-hero-side-item" key={slide.item.id}>
              <Banner className="shop-slide shop-slide--small" slide={slide} />
            </div>
          ))}
        </div>
      </section>
      <section aria-label="À la une" className="shop-hero-mobile">
        <Banner className="shop-slide" priority slide={mobileSlide} />
      </section>
    </>
  );
}

/** Immobilier et Services : une seule bannière (ordinateur et téléphone), gérée dans Administration → Annonces. */
export function ShopSingleBanner({ banner, fallback }: { banner: DashboardAnnouncement | null; fallback: DrawnSlide }) {
  return (
    <section aria-label="À la une" className="shop-single-banner">
      <Banner className="shop-slide" priority slide={banner ? { kind: "image", item: banner } : { kind: "drawn", item: fallback }} />
    </section>
  );
}
