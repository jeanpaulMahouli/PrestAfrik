import type { ReactNode } from "react";
import { marketplaceAds } from "@/config/marketplace-ads";
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
 * Bannière principale « Devenir vendeur » : une image (comme les autres emplacements publicitaires),
 * entièrement cliquable vers /boutique. Elle sert aussi de destination aux publicités : les paramètres de
 * campagne sont ajoutés au lien au moment du clic (components/analytics/analytics.tsx, emplacement
 * « heros »). Visuels : config/marketplace-ads.ts (ordinateur 424 × 248, téléphone 358 × 287).
 */
export function SellerBanner({ href, variant, image = null }: { href: string; variant: "desktop" | "mobile"; image?: DashboardAnnouncement | null }) {
  const fallback = variant === "desktop" ? marketplaceAds.seller : marketplaceAds.sellerMobile;
  const ad = image ? { ...fallback, src: image.imageUrl, alt: image.altText } : fallback;
  return (
    <a className={`shop-seller shop-seller--${variant}`} data-emplacement="heros" href={href}>
      <img alt={ad.alt} decoding="async" fetchPriority="high" height={ad.size[1]} loading="eager" src={ad.src} width={ad.size[0]} />
    </a>
  );
}

/** Bannière dessinée d'un univers (sans visuel dans l'administration) : texte, deux boutons et une illustration. */
export type UniverseHero = {
  kicker: string;
  title: string;
  text: string;
  cta: { label: string; href: string };
  seller: { label: string; href: string };
  icon: ReactNode;
};

/**
 * Immobilier, Services et Restauration : une seule bannière par page, dans le cadre du grand visuel du
 * Shopping (mêmes coins, même hauteur). L'image vient de Administration → Annonces ; à défaut, une bannière
 * dessinée aux couleurs de PrestAfrik, comme les visuels du Shopping.
 */
export function ShopSingleBanner({ banner, hero }: { banner: DashboardAnnouncement | null; hero: UniverseHero }) {
  return (
    <section aria-label="À la une" className="shop-single-banner sx-single-hero">
      {banner ? (
        <Banner className="shop-slide" priority slide={{ kind: "image", item: banner }} />
      ) : (
        <div className="sx-single-drawn">
          <div className="sx-single-copy">
            <p className="sx-single-kicker">{hero.kicker}</p>
            <p className="sx-single-title">{hero.title}</p>
            <p className="sx-single-text">{hero.text}</p>
            <div className="sx-single-actions">
              <a className="sx-btn sx-btn-primary" href={hero.cta.href}>{hero.cta.label}</a>
              <a className="sx-single-seller" href={hero.seller.href}>{hero.seller.label}</a>
            </div>
          </div>
          <span aria-hidden="true" className="sx-single-art">{hero.icon}</span>
        </div>
      )}
    </section>
  );
}
