import { z } from "zod";

export const hexColorSchema = z.string().regex(/^#[\da-f]{6}$/i, "Saisis une couleur hexadécimale valide.");

export const productSchema = z
  .object({
    name: z.string().trim().min(2).max(140),
    sku: z.string().trim().min(1).max(48).regex(/^[\p{L}\p{N}_-]+$/u),
    description: z.string().trim().max(4000).optional(),
    categoryId: z.string().cuid().optional(),
    priceXaf: z.number().int().positive().max(1_000_000_000),
    promotionalPriceXaf: z.number().int().positive().max(1_000_000_000).nullable(),
    availability: z.enum(["AVAILABLE", "SOLD_OUT", "PREORDER"]),
    trackInventory: z.boolean(),
    stockQuantity: z.number().int().nonnegative().max(1_000_000).nullable(),
    isFeatured: z.boolean(),
  })
  .refine(
    ({ priceXaf, promotionalPriceXaf }) =>
      promotionalPriceXaf === null || promotionalPriceXaf < priceXaf,
    { path: ["promotionalPriceXaf"], message: "Le prix promotionnel doit être inférieur au prix normal." },
  )
  .refine(
    ({ trackInventory, stockQuantity }) =>
      !trackInventory || (stockQuantity !== null && stockQuantity >= 0),
    { path: ["stockQuantity"], message: "Indique un stock valide si tu suis les quantités." },
  );

export type ProductInput = z.infer<typeof productSchema>;

export type ProductVariantInput = {
  sku: string;
  optionName: string;
  optionValue: string;
  priceXaf: number | null;
  stockQuantity: number | null;
};

export function parseVariants(raw: FormDataEntryValue | null): ProductVariantInput[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  const parsed = JSON.parse(raw) as unknown;
  return z
    .array(
      z.object({
        sku: z.string().trim().min(1).max(48).regex(/^[\p{L}\p{N}_-]+$/u),
        optionName: z.string().trim().min(1).max(60),
        optionValue: z.string().trim().min(1).max(80),
        priceXaf: z.number().int().positive().max(1_000_000_000).nullable(),
        stockQuantity: z.number().int().nonnegative().max(1_000_000).nullable(),
      }),
    )
    .max(100)
    .parse(parsed);
}

export function safeCsvCell(value: string | number | null | undefined): string {
  const normalized = String(value ?? "").replace(/[\r\n]+/g, " ").trim();
  const protectedValue = /^[\s]*[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}

export function parseCsvRows(input: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      cell = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("Le fichier CSV contient un guillemet non terminé.");
  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);

  const [rawHeaders, ...data] = rows;
  const headers = rawHeaders?.map((header) => header.replace(/^\uFEFF/, "").toLowerCase()) ?? [];
  if (headers.length === 0) throw new Error("Le fichier CSV ne contient aucune colonne.");
  if (data.some((values) => values.length !== headers.length)) {
    throw new Error("Certaines lignes ne possèdent pas le même nombre de colonnes.");
  }
  return { headers, rows: data };
}
