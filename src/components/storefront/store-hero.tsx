import { MapPin, Package, Star } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { StoreImage } from "@/components/ui/store-image";
import { defaultStoreCover } from "@/lib/store-cover";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { StoreShareButton } from "./store-share-button";

/**
 * En-tête de la boutique publique (inspiré des pages boutique des marketplaces) : la couverture (diaporama
 * du vendeur, sinon sa photo de couverture, sinon la couverture par défaut), puis une carte d'identité qui la
 * chevauche : logo rond, nom, note, nombre de produits, ville, boutons WhatsApp et Partager.
 */
export function StoreHero({
  cover,
  coverUrl,
  name,
  initials,
  logoUrl,
  city,
  productCount,
  rating,
  whatsappNumber,
  shareUrl,
}: {
  /** Diaporama du vendeur (Marketing → Bannière), prioritaire sur la photo de couverture. */
  cover: ReactNode;
  coverUrl: string | null;
  name: string;
  initials: string;
  logoUrl: string | null;
  city: string | null;
  productCount: number;
  rating: { average: number; count: number } | null;
  whatsappNumber: string | null;
  shareUrl: string;
}) {
  const digits = whatsappNumber?.replace(/\D/g, "") ?? "";
  const whatsapp = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(`Bonjour ${name}, j’ai une question.`)}` : null;

  return (
    <section aria-label={`Boutique ${name}`} className={`sf-store-hero${cover ? " has-slides" : " has-cover"}`}>
      {cover ?? (
        <div aria-hidden="true" className="sf-store-cover">
          <StoreImage alt="" fill priority sizes="(max-width: 1152px) 100vw, 1152px" src={coverUrl ?? defaultStoreCover} />
        </div>
      )}
      <div className="sf-store-card">
        <span aria-hidden="true" className="sf-store-card-logo" data-store-logo="">
          {logoUrl ? <StoreImage alt="" height={96} src={logoUrl} width={96} /> : initials}
        </span>
        <div className="sf-store-card-text">
          <h1 data-store-name="">{name}</h1>
          <ul className="sf-store-card-meta">
            {rating && rating.count > 0 && (
              <li className="is-rating">
                <Star aria-hidden="true" size={16} weight="fill" />
                <strong>{rating.average.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</strong>
                <span>
                  ({rating.count} avis)
                </span>
              </li>
            )}
            <li>
              <Package aria-hidden="true" size={16} />
              {productCount} produit{productCount > 1 ? "s" : ""}
            </li>
            {city && (
              <li>
                <MapPin aria-hidden="true" size={16} />
                {city}
              </li>
            )}
          </ul>
        </div>
        <div className="sf-store-card-actions">
          {whatsapp && (
            <a className="sf-btn sf-btn-primary sf-store-card-chat" href={whatsapp} rel="noopener noreferrer" target="_blank">
              <WhatsAppIcon size={18} />
              <span>Discuter</span>
            </a>
          )}
          <StoreShareButton name={name} url={shareUrl} />
        </div>
      </div>
    </section>
  );
}
