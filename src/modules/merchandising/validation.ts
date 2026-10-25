import { z } from "zod";
import { storeLinkSchema } from "@/modules/merchandising/links";

export const maxBanners = 4;
export const bannerFrame = { width: 1920, height: 1080 } as const;
export const popupFrame = { width: 1080, height: 1350 } as const;
export const bannerLimitMessage = "Vous avez atteint les 4 images autorisées. Supprimez-en une pour en ajouter une nouvelle.";

const altText = z.string().trim().max(200, "Le texte alternatif ne peut pas dépasser 200 caractères.");

/** Champs texte d'une image de bannière (l'image elle-même est vérifiée par saveStoreImage). */
export const bannerFieldsSchema = z.object({ altText }).and(storeLinkSchema);

/** Jour (AAAA-MM-JJ) à l'heure de Douala : début de journée pour une date de début, fin de journée pour une date de fin. */
const optionalDay = (time: "00:00:00" | "23:59:59") =>
  z
    .string()
    .trim()
    .optional()
    .transform((value, context) => {
      if (!value) return null;
      const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T${time}+01:00`) : new Date(Number.NaN);
      if (Number.isNaN(date.getTime())) {
        context.addIssue({ code: "custom", message: "Date invalide. Choisissez un jour dans le calendrier." });
        return z.NEVER;
      }
      return date;
    });

/** Jour affiché dans un champ date (heure de Douala). */
export function dayInputValue(date: Date | null) {
  return date ? new Date(date.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10) : "";
}

export const popupFieldsSchema = z
  .object({
    title: z.string().trim().min(2, "Donnez un nom à ce popup (2 caractères minimum).").max(80, "Le nom ne peut pas dépasser 80 caractères."),
    altText,
    isActive: z.boolean(),
    startsAt: optionalDay("00:00:00"),
    endsAt: optionalDay("23:59:59"),
  })
  .and(storeLinkSchema)
  .superRefine((popup, context) => {
    if (popup.startsAt && popup.endsAt && popup.endsAt <= popup.startsAt) {
      context.addIssue({ code: "custom", path: ["endsAt"], message: "La date de fin doit être après la date de début." });
    }
  });

/** Champs du lien lus dans un formulaire, avant validation. */
export function linkFields(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : undefined;
  };
  return { linkType: text("linkType") ?? "NONE", categoryId: text("categoryId"), productId: text("productId") };
}
