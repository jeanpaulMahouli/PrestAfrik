import { marketplaceAds } from "@/config/marketplace-ads";
import type { DashboardAnnouncement } from "@/modules/announcements/queries";

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
