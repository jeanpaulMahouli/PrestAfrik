import { Apple, Baby, BookOpen, Car, Dumbbell, Footprints, Gem, Glasses, HeartPulse, Palette, Shirt, Smartphone, Sofa, Sparkles, Store, Tv, Wrench, type LucideIcon } from "lucide-react";

/**
 * Icône et teinte de chaque rubrique de la marketplace (activités des boutiques, migration
 * 20261015130000). Une activité ajoutée plus tard prend l'icône « boutique » par défaut.
 */
export const categoryLook: Record<string, { icon: LucideIcon; tint: string }> = {
  "vetements-mode": { icon: Shirt, tint: "#ff9900" },
  "beaute-cosmetiques": { icon: Sparkles, tint: "#e8508a" },
  "maison-decoration": { icon: Sofa, tint: "#1f9d74" },
  alimentation: { icon: Apple, tint: "#e85d3a" },
  accessoires: { icon: Glasses, tint: "#7c5cff" },
  artisanat: { icon: Palette, tint: "#b8682a" },
  electronique: { icon: Tv, tint: "#2f6bff" },
  "telephonie-informatique": { icon: Smartphone, tint: "#1a8fd6" },
  chaussures: { icon: Footprints, tint: "#c2410c" },
  bijoux: { icon: Gem, tint: "#c8a12c" },
  "enfants-bebes": { icon: Baby, tint: "#f472b6" },
  "sante-bien-etre": { icon: HeartPulse, tint: "#16a34a" },
  "sport-loisirs": { icon: Dumbbell, tint: "#0ea5e9" },
  "librairie-papeterie": { icon: BookOpen, tint: "#6d4aff" },
  "auto-moto": { icon: Car, tint: "#475569" },
  services: { icon: Wrench, tint: "#0f766e" },
};

export function categoryIcon(slug: string | null | undefined) {
  return (slug && categoryLook[slug]) || { icon: Store, tint: "#ff9900" };
}
