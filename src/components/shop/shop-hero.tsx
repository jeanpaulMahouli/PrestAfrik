"use client";

import { ChevronLeft, ChevronRight, HandCoins, Rocket, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DashboardAnnouncement } from "@/modules/announcements/queries";

/** Diapositive dessinée (sans image) : affichée tant que l'administration n'a pas ajouté de visuel. */
export type DrawnSlide = { id: string; kicker: string; title: string; text: string; cta: string; href: string; tone: "orange" | "navy" | "coral"; icon: "sparkles" | "zap" | "rocket" | "coins" };

const icons: Record<DrawnSlide["icon"], LucideIcon> = { sparkles: Sparkles, zap: Zap, rocket: Rocket, coins: HandCoins };

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

function DrawnContent({ slide }: { slide: DrawnSlide }) {
  const Icon = icons[slide.icon];
  return (
    <>
      <span aria-hidden="true" className="shop-slide-shine" />
      <span aria-hidden="true" className="shop-slide-icon">
        <Icon size={120} strokeWidth={1.2} />
      </span>
      <span className="shop-slide-copy">
        <span className="shop-slide-kicker">{slide.kicker}</span>
        <strong className="shop-slide-title">{slide.title}</strong>
        <span className="shop-slide-text">{slide.text}</span>
        <span className="shop-slide-cta">{slide.cta}</span>
      </span>
    </>
  );
}

/**
 * Haut de la marketplace : grand diaporama (5 s par image, pause au survol, glissé au doigt) et deux
 * visuels à côté. Visuels gérés dans Administration → Annonces ; à défaut, des diapositives dessinées.
 */
export function ShopHero({ carousel, banners, drawn, drawnBanners }: { carousel: DashboardAnnouncement[]; banners: DashboardAnnouncement[]; drawn: DrawnSlide[]; drawnBanners: DrawnSlide[] }) {
  const slides: Slide[] = carousel.length ? carousel.map((item) => ({ kind: "image", item })) : drawn.map((item) => ({ kind: "drawn", item }));
  const sides: Slide[] = banners.length ? banners.map((item) => ({ kind: "image", item })) : drawnBanners.map((item) => ({ kind: "drawn", item }));
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

  const render = (slide: Slide, className: string, priority = false) =>
    slide.kind === "image" ? (
      <SlideLink className={className} href={slide.item.linkUrl}>
        {/* Images déjà converties en WebP au bon format à l'envoi. */}
        <img alt={slide.item.altText} decoding="async" fetchPriority={priority ? "high" : "auto"} loading={priority ? "eager" : "lazy"} src={slide.item.imageUrl} />
      </SlideLink>
    ) : (
      <SlideLink className={`${className} shop-slide--drawn shop-slide--${slide.item.tone}`} href={slide.item.href}>
        <DrawnContent slide={slide.item} />
      </SlideLink>
    );

  return (
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
              {render(slide, "shop-slide", position === 0)}
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
            {render(slide, "shop-slide shop-slide--small")}
          </div>
        ))}
      </div>
    </section>
  );
}
