import { WhatsappLogo } from "@phosphor-icons/react/ssr";

/**
 * Icône WhatsApp de la marketplace : le logo de la banque d'icônes (Phosphor), dessiné directement.
 * Plus de masque CSS sur une image : en production, les styles sont servis depuis prestafrik.com et le
 * navigateur refusait l'image du masque sur shop.prestafrik.com (autre domaine), l'icône n'apparaissait pas.
 * Couleur : classe .sx-wa (shop-showcase.css), ou celle du texte voisin.
 */
export function WhatsappMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return <WhatsappLogo aria-hidden="true" className={`sx-wa ${className}`.trim()} size={size} />;
}
