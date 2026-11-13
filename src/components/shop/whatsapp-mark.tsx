/**
 * Icône WhatsApp de la marketplace (public/marketplace/icone-whatsapp.png, traits fins), en masque : elle prend
 * la couleur du texte voisin. Taille et couleur : classe .sx-wa (shop-showcase.css).
 */
export function WhatsappMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return <span aria-hidden="true" className={`sx-wa ${className}`} style={{ width: size, height: size }} />;
}
