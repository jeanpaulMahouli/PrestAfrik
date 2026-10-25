import { z } from "zod";

// Règles du catalogue (brief §6.4). Les montants XAF sont des entiers, jamais des flottants.

export const hexColorSchema = z.string().regex(/^#[\da-f]{6}$/i, "Saisissez une couleur au format #RRGGBB.");

const amount = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,9}$/, `${label} : un nombre entier en FCFA, sans espace ni virgule.`)
    .transform(Number);

const optionalAmount = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{1,9}$/.test(value), `${label} : un nombre entier en FCFA, sans espace ni virgule.`)
    .transform((value) => (value === "" ? null : Number(value)));

export const skuPattern = /^[\p{L}\p{N}_-]+$/u;

export const productFormSchema = z
  .object({
    name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(120, "Le nom ne peut pas dépasser 120 caractères."),
    description: z
      .string()
      .trim()
      .max(2000, "La description ne peut pas dépasser 2 000 caractères.")
      .refine((value) => !/<[a-z/!]/i.test(value), "La description est un texte simple : retirez les balises HTML."),
    categoryId: z.string().trim(),
    newCategory: z.string().trim().max(80, "Le nom de catégorie ne peut pas dépasser 80 caractères."),
    priceXaf: amount("Prix"),
    promotionalPriceXaf: optionalAmount("Prix promotionnel"),
    sku: z
      .string()
      .trim()
      .max(40, "La référence ne peut pas dépasser 40 caractères.")
      .refine((value) => value === "" || skuPattern.test(value), "La référence n’utilise que des lettres, chiffres, tirets et _."),
    availability: z.enum(["AVAILABLE", "SOLD_OUT", "PREORDER"], { message: "Choisissez une disponibilité." }),
    trackInventory: z.boolean(),
    stockQuantity: optionalAmount("Quantité en stock"),
    status: z.enum(["ACTIVE", "DRAFT"], { message: "Choisissez l’état du produit." }),
    isFeatured: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.promotionalPriceXaf !== null && value.promotionalPriceXaf >= value.priceXaf) {
      context.addIssue({ code: "custom", path: ["promotionalPriceXaf"], message: "Le prix promotionnel doit être strictement inférieur au prix." });
    }
    if (value.trackInventory && value.availability !== "PREORDER" && value.stockQuantity === null) {
      context.addIssue({ code: "custom", path: ["stockQuantity"], message: "Indiquez la quantité en stock (0 si épuisé)." });
    }
  });

export type ProductFormInput = z.infer<typeof productFormSchema>;

export const variantsSchema = z
  .array(
    z.object({
      sku: z.string().trim().max(40).refine((value) => value === "" || skuPattern.test(value), "Référence de variante invalide."),
      optionName: z.string().trim().min(1, "Indiquez le nom de l’option (ex. Taille).").max(60),
      optionValue: z.string().trim().min(1, "Indiquez la valeur de chaque variante (ex. M).").max(80),
      priceXaf: z.number().int().nonnegative().max(999_999_999).nullable(),
      stockQuantity: z.number().int().nonnegative().max(1_000_000).nullable(),
    }),
  )
  .max(100, "100 variantes au maximum.");

export type ProductVariantInput = z.infer<typeof variantsSchema>[number];

export const photosSchema = z
  .array(
    z.object({
      id: z.string().optional(),
      key: z.string().optional(),
      alt: z.string().trim().max(200, "Texte alternatif : 200 caractères au maximum."),
    }),
  )
  .max(5, "Vous avez atteint la limite de 5 photos par produit.");

export function parseJsonField<T>(raw: FormDataEntryValue | null, schema: z.ZodType<T>, fallback: T) {
  if (typeof raw !== "string" || raw.length === 0) return { success: true as const, data: fallback };
  try {
    return schema.safeParse(JSON.parse(raw));
  } catch {
    return schema.safeParse(undefined);
  }
}

/** Neutralise l'injection de formules dans les tableurs (brief §6.4). */
export function safeCsvCell(value: string | number | null | undefined): string {
  const normalized = String(value ?? "").replace(/[\r\n]+/g, " ");
  const protectedValue = /^[=+\-@\t\r]/.test(normalized) || /^\s+[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
  return `"${protectedValue.trim().replace(/"/g, '""')}"`;
}

/** Analyse un CSV UTF-8 ; le séparateur (« , » ou « ; ») est détecté sur la ligne d'en-tête. */
export function parseCsvRows(input: string): { headers: string[]; rows: string[][] } {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const separator = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === separator) {
      row.push(cell.trim());
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      cell = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("Le fichier contient un guillemet non fermé.");
  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);

  const [rawHeaders, ...data] = rows;
  const headers =
    rawHeaders?.map((header) =>
      header
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim(),
    ) ?? [];
  if (headers.length === 0) throw new Error("Le fichier ne contient aucune colonne.");
  return { headers, rows: data };
}

/** Adresses déjà prises par des pages de la boutique (/panier, /promotions…) : jamais attribuées à un produit. */
export const reservedProductSlugs: ReadonlySet<string> = new Set(["panier", "commande", "suivi", "page", "promotions"]);
