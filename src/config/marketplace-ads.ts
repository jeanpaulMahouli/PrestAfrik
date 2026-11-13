/**
 * Emplacements publicitaires de la marketplace (images). En attendant vos visuels, chaque emplacement
 * montre le visuel correspondant de la maquette (public/marketplace/pub/). Pour mettre votre publicité :
 * déposez l'image dans public/marketplace/pub/ (même format, voir `size`) et changez `src`, `alt` et `href`.
 * Le héros et ses visuels de côté se gèrent aussi dans Administration → Annonces (prioritaires sur ceux-ci).
 */
export type AdSlot = { src: string; alt: string; href: string; /** Taille de référence (px), pour le format. */ size: [number, number] };

const ad = (file: string, alt: string, href: string, size: [number, number]): AdSlot => ({ src: `/marketplace/pub/${file}.webp`, alt, href, size });

/** Visuel d'un emplacement : celui de l'administration (Annonces) s'il existe, sinon le visuel par défaut. */
export function slotAd(item: { imageUrl: string; altText: string; linkUrl: string | null } | null | undefined, fallback: AdSlot): AdSlot {
  return item ? { src: item.imageUrl, alt: item.altText, href: item.linkUrl ?? fallback.href, size: fallback.size } : fallback;
}

export const marketplaceAds = {
  /** Grand visuel du héros (diaporama si l'administration en a plusieurs). */
  hero: ad("heros-principal", "Offre à la une", "/recherche?tri=promo&promo=1", [872, 520]),
  /** Bannière « Devenir vendeur » (mène à /boutique, destination des publicités) : ordinateur et téléphone. */
  // Visuel provisoire : celui de la maquette ; remplacez-le par votre image « Devenir vendeur » (Administration → Annonces).
  seller: ad("heros-cote-haut", "Vendeurs, commerçants, artisans : vendez en ligne sans limite. Devenir vendeur sur PrestAfrik", "/boutique", [424, 248]),
  sellerMobile: ad("heros-cote-haut", "Vendeurs, commerçants, artisans : vendez en ligne sans limite. Devenir vendeur sur PrestAfrik", "/boutique", [424, 248]),
  /** Visuel sous la bannière « Devenir vendeur », à droite du héros. */
  heroSide: ad("heros-cote-bas", "Bon plan du moment", "/recherche?tri=nouveautes", [424, 248]),
  /** Colonne à gauche des « Produits phares ». */
  featuredColumn: ad("colonne-promo", "Promotion du moment", "/recherche?tri=promo&promo=1", [312, 716]),
  /** Deux bannières côte à côte. */
  duoLeft: ad("duo-gauche", "Nouveauté à découvrir", "/recherche?tri=nouveautes", [648, 336]),
  duoRight: ad("duo-droite", "Offre spéciale", "/recherche?tri=mieux-notes", [648, 336]),
  /** Colonne à droite du second bloc de produits. */
  columnTop: ad("colonne-haut", "Coup de cœur", "/recherche?tri=mieux-notes", [312, 428]),
  columnBottom: ad("colonne-bas", "Petits prix", "/recherche?max=5000", [312, 264]),
  /** Grande bannière pleine largeur. */
  wide: ad("large", "Grande offre", "/recherche?tri=promo&promo=1", [1438, 424]),
  /** Colonne des filtres de la page de recherche. */
  searchSide: ad("recherche-cote", "Offre à saisir", "/recherche?tri=promo&promo=1", [312, 575]),
  /** Grand menu « Toutes les catégories ». */
  menu: ad("menu-offre", "Offre du moment", "/recherche?tri=promo&promo=1", [312, 384]),
} satisfies Record<string, AdSlot>;
