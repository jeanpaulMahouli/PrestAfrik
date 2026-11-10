import type { Icon } from "@phosphor-icons/react";
import { Baby, Barbell, BookOpen, Buildings, Car, Couch, DeviceMobile, Diamond, Eyeglasses, ForkKnife, Heartbeat, Palette, Sneaker, Sparkle, Storefront, Television, TShirt, Wrench } from "@phosphor-icons/react/ssr";

/**
 * Icône Phosphor de chaque catégorie (activités des boutiques), pour les carrés « Achetez par catégorie ».
 * Une activité ajoutée plus tard prend l'icône « boutique » par défaut.
 */
const glyphs: Record<string, Icon> = {
  "vetements-mode": TShirt,
  "beaute-cosmetiques": Sparkle,
  "maison-decoration": Couch,
  alimentation: ForkKnife,
  accessoires: Eyeglasses,
  artisanat: Palette,
  electronique: Television,
  "telephonie-informatique": DeviceMobile,
  chaussures: Sneaker,
  bijoux: Diamond,
  "enfants-bebes": Baby,
  "sante-bien-etre": Heartbeat,
  "sport-loisirs": Barbell,
  "librairie-papeterie": BookOpen,
  "auto-moto": Car,
  services: Wrench,
  immobilier: Buildings,
};

export const categoryGlyph = (slug: string | null | undefined): Icon => (slug && glyphs[slug]) || Storefront;
