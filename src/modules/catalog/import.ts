import { z } from "zod";
import { parseCsvRows, skuPattern } from "@/modules/catalog/validation";

// Import CSV du catalogue (brief §6.4) : colonnes reference, nom, description, categorie, prix,
// prix_promo, disponibilite, stock. Une référence existante met à jour le produit correspondant.

export const importColumns = ["reference", "nom", "description", "categorie", "prix", "prix_promo", "disponibilite", "stock"] as const;
export const maxImportBytes = 5 * 1024 * 1024;
export const maxImportRows = 1000;

const availabilityValues: Record<string, "AVAILABLE" | "SOLD_OUT" | "PREORDER"> = {
  "": "AVAILABLE",
  disponible: "AVAILABLE",
  available: "AVAILABLE",
  epuise: "SOLD_OUT",
  "sold_out": "SOLD_OUT",
  "sur commande": "PREORDER",
  "sur_commande": "PREORDER",
  preorder: "PREORDER",
};

const normalize = (value: string) => value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export type ImportRow = {
  line: number;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  priceXaf: number;
  promotionalPriceXaf: number | null;
  availability: "AVAILABLE" | "SOLD_OUT" | "PREORDER";
  stockQuantity: number | null;
};

export type ImportIssue = { line: number; column: string; message: string };

export type ImportAnalysis = {
  rows: ImportRow[];
  errors: ImportIssue[];
  preview: { line: number; values: Record<string, string>; valid: boolean }[];
  totalLines: number;
};

const integer = (value: string) => (/^\d{1,9}$/.test(value.replace(/[\s  ]/g, "")) ? Number(value.replace(/[\s  ]/g, "")) : null);

export function analyzeProductCsv(content: string): ImportAnalysis {
  const { headers, rows } = parseCsvRows(content);
  const missing = ["reference", "nom", "prix"].filter((column) => !headers.includes(column));
  if (missing.length) {
    throw new Error(`Colonnes obligatoires manquantes : ${missing.join(", ")}. Colonnes attendues : ${importColumns.join(", ")}.`);
  }
  if (rows.length > maxImportRows) throw new Error(`Le fichier contient ${rows.length} lignes : 1 000 au maximum par import.`);

  const errors: ImportIssue[] = [];
  const valid: ImportRow[] = [];
  const preview: ImportAnalysis["preview"] = [];
  const seen = new Set<string>();

  rows.forEach((cells, index) => {
    const line = index + 2;
    const values = Object.fromEntries(headers.map((header, column) => [header, (cells[column] ?? "").trim()]));
    const issues: ImportIssue[] = [];
    const add = (column: string, message: string) => issues.push({ line, column, message });

    const sku = values.reference ?? "";
    if (!sku) add("reference", "Référence manquante");
    else if (sku.length > 40 || !skuPattern.test(sku)) add("reference", `Référence « ${sku} » invalide`);
    else if (seen.has(sku.toLowerCase())) add("reference", `Référence « ${sku} » répétée dans le fichier`);

    const name = values.nom ?? "";
    if (name.length < 2) add("nom", "Nom manquant");
    else if (name.length > 120) add("nom", "Nom trop long (120 caractères au maximum)");

    const price = integer(values.prix ?? "");
    if (price === null) add("prix", `Prix « ${values.prix ?? ""} » : entier attendu`);
    const promo = values.prix_promo ? integer(values.prix_promo) : null;
    if (values.prix_promo && promo === null) add("prix_promo", `Prix promo « ${values.prix_promo} » : entier attendu`);
    if (price !== null && promo !== null && promo >= price) add("prix_promo", "Prix promo supérieur ou égal au prix");

    const availability = availabilityValues[normalize(values.disponibilite ?? "")];
    if (!availability) add("disponibilite", `Disponibilité « ${values.disponibilite} » inconnue (disponible, épuisé, sur commande)`);
    const stock = values.stock ? integer(values.stock) : null;
    if (values.stock && stock === null) add("stock", `Stock « ${values.stock} » : entier attendu`);

    const description = values.description ?? "";
    if (description.length > 2000) add("description", "Description trop longue (2 000 caractères au maximum)");
    if (/<[a-z/!]/i.test(description)) add("description", "Description en texte simple : retirez le HTML");
    const category = values.categorie ?? "";
    if (category.length > 80) add("categorie", "Catégorie trop longue (80 caractères au maximum)");

    if (sku) seen.add(sku.toLowerCase());
    if (preview.length < 20) preview.push({ line, values, valid: issues.length === 0 });
    if (issues.length) {
      errors.push(...issues);
      return;
    }
    valid.push({
      line,
      sku,
      name,
      description: description || null,
      category: category || null,
      priceXaf: price!,
      promotionalPriceXaf: promo,
      availability: stock === 0 && availability === "AVAILABLE" ? "SOLD_OUT" : availability!,
      stockQuantity: stock,
    });
  });

  return { rows: valid, errors, preview, totalLines: rows.length };
}

export const importModeSchema = z.enum(["preview", "confirm"]);
