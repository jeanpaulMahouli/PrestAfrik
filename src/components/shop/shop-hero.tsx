"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
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
 * Bannière principale « Devenir vendeur » : un seul objectif, le bouton qui mène à /boutique. Toute la
 * bannière est cliquable. Elle sert aussi de destination aux publicités : les paramètres de campagne
 * sont ajoutés au lien au moment du clic (components/analytics/analytics.tsx, emplacement « heros »).
 * Ordinateur : texte à gauche, téléphone à droite. Téléphone : format vertical, bouton pleine largeur.
 */
export function SellerBanner({ href, variant }: { href: string; variant: "desktop" | "mobile" }) {
  return (
    <a className={`shop-seller shop-seller--${variant}`} data-emplacement="heros" href={href}>
      <span aria-hidden="true" className="shop-seller-glow" />
      <span className="shop-seller-text">
        <span className="shop-seller-kicker">Vendeurs, commerçants, artisans</span>
        <strong className="shop-seller-title">Vendez en ligne sans limite</strong>
        <span className="shop-seller-sub">Votre boutique en 5 minutes depuis votre téléphone. Vos clients vous écrivent sur WhatsApp et paient à la livraison.</span>
        <span className="shop-seller-cta">
          Devenir vendeur <ChevronRight aria-hidden="true" size={20} strokeWidth={2.6} />
        </span>
      </span>
      <span aria-hidden="true" className="shop-seller-phone">
        {/* Image prioritaire, légère (WebP redimensionné) : rien ne retarde l'affichage du bouton. */}
        <Image alt="" fetchPriority="high" height={1495} loading="eager" sizes={variant === "desktop" ? "220px" : "140px"} src="/landing/screens/telephone-1-boutique-v2.webp" width={720} />
      </span>
    </a>
  );
}

/**
 * Haut de la marketplace (univers « Shopping »). Ordinateur : la bannière « Devenir vendeur » en grand, et à
 * côté le diaporama des visuels de l'administration (5 s par image, pause au survol) puis un visuel fixe.
 * Téléphone : la bannière « Devenir vendeur » seule, au format vertical. Visuels et boutons gérés dans
 * Administration → Annonces ; tant qu'il n'y a pas d'image, l'emplacement montre seulement son bouton.
 */
export function ShopHero({ carousel, banners, drawn, drawnBanners, sellerHref }: { carousel: DashboardAnnouncement[]; banners: DashboardAnnouncement[]; drawn: DrawnSlide[]; drawnBanners: DrawnSlide[]; sellerHref: string }) {
  const slides: Slide[] = carousel.length ? carousel.map((item) => ({ kind: "image", item })) : drawn.map((item) => ({ kind: "drawn", item }));
  const fixed: Slide = banners.length ? { kind: "image", item: banners[0] } : { kind: "drawn", item: drawnBanners[0] };
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
      <section aria-label="Devenir vendeur sur PrestAfrik" className="shop-hero">
        <SellerBanner href={sellerHref} variant="desktop" />
        <div className="shop-hero-side">
          <div
            aria-roledescription="diaporama"
            aria-label="À la une"
            className="shop-carousel shop-hero-side-item"
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
                  <Banner className="shop-slide" slide={slide} />
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
          <div className="shop-hero-side-item">
            <Banner className="shop-slide shop-slide--small" slide={fixed} />
          </div>
        </div>
      </section>
      <section aria-label="Devenir vendeur sur PrestAfrik" className="shop-hero-mobile">
        <SellerBanner href={sellerHref} variant="mobile" />
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
