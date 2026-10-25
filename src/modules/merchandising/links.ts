import { z } from "zod";
import { storeHref } from "@/lib/store-host";

// Lien d'une image de bannière ou d'un popup : aucun, une catégorie, un produit ou la page des promotions.
// Partagé par le serveur (enregistrement, vitrine) et les formulaires du tableau de bord.

export const storeLinkTypes = ["NONE", "CATEGORY", "PRODUCT", "PROMO"] as const;
export type StoreLinkKind = (typeof storeLinkTypes)[number];

export const storeLinkLabels: Record<StoreLinkKind, string> = {
  NONE: "Aucun (image non cliquable)",
  CATEGORY: "Une catégorie",
  PRODUCT: "Un produit",
  PROMO: "Tous les produits en promotion",
};

/** Lien saisi dans un formulaire : la catégorie ou le produit est obligatoire selon le type choisi. */
export const storeLinkSchema = z
  .object({
    linkType: z.enum(storeLinkTypes, { error: "Choisissez où mène l’image." }),
    categoryId: z.string().trim().max(40).optional().transform((value) => value || null),
    productId: z.string().trim().max(40).optional().transform((value) => value || null),
  })
  .superRefine((link, context) => {
    if (link.linkType === "CATEGORY" && !link.categoryId) context.addIssue({ code: "custom", path: ["categoryId"], message: "Choisissez la catégorie à ouvrir." });
    if (link.linkType === "PRODUCT" && !link.productId) context.addIssue({ code: "custom", path: ["productId"], message: "Choisissez le produit à ouvrir." });
  })
  .transform((link) => ({
    linkType: link.linkType,
    categoryId: link.linkType === "CATEGORY" ? link.categoryId : null,
    productId: link.linkType === "PRODUCT" ? link.productId : null,
  }));

export type StoreLinkInput = z.output<typeof storeLinkSchema>;

/** Lien tel que lu en base, avec la catégorie ou le produit visé. */
export type StoredLink = {
  linkType: StoreLinkKind;
  category: { slug: string } | null;
  product: { slug: string; status: string } | null;
};

/**
 * Adresse ouverte au clic, ou null (image non cliquable). Un produit archivé ou une catégorie supprimée
 * rend l'image non cliquable plutôt que de mener à une page introuvable.
 */
export function storeLinkHref(link: StoredLink, base: string) {
  switch (link.linkType) {
    case "CATEGORY":
      return link.category ? `${storeHref(base)}?categorie=${encodeURIComponent(link.category.slug)}` : null;
    case "PRODUCT":
      return link.product && link.product.status === "ACTIVE" ? storeHref(base, link.product.slug) : null;
    case "PROMO":
      return storeHref(base, "promotions");
    default:
      return null;
  }
}

/** Sélection Prisma commune pour lire un lien. */
export const storedLinkSelect = {
  linkType: true,
  category: { select: { slug: true } },
  product: { select: { slug: true, status: true } },
} as const;
