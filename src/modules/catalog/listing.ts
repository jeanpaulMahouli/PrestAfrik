import { z } from "zod";

// Annonces immobilières : dans l'univers Immobilier, uniquement des locations (au mois, à l'année) et des
// réservations (à la nuit) ; la vente de biens se fait dans le Shopping (activité « Vente immobilière »).
// Chaque annonce a ses caractéristiques (type de bien, surface, pièces…). Module sans dépendance serveur : utilisé par le
// formulaire produit, la fiche publique et l'enregistrement, et testé unitairement.

export const listingTypes = [
  { value: "SALE", label: "À vendre" },
  { value: "RENT", label: "À louer" },
] as const;

export const pricePeriods = [
  { value: "MONTH", label: "Location au mois", short: "/ mois" },
  { value: "YEAR", label: "Location à l’année", short: "/ an" },
  { value: "DAY", label: "Réservation à la nuit (meublé, séjour court)", short: "/ nuit" },
] as const;

/** « rent » : univers Immobilier (locations et réservations) ; « sale » : Shopping, activité « Vente immobilière ». */
export type ListingMode = "rent" | "sale";

/** Activité du Shopping dont les produits sont des biens à vendre (avec leurs caractéristiques). */
export const propertySaleActivity = "vente-immobiliere";

/**
 * Activités de l'univers Immobilier consacrées aux véhicules (location, vente) : produits ordinaires,
 * sans fiche de bien (type de bien, pièces, surface).
 */
export const vehicleActivities = ["location-vehicules", "vente-vehicules"] as const;

export const propertyTypes = [
  "Appartement",
  "Studio",
  "Chambre",
  "Maison / Villa",
  "Duplex",
  "Terrain",
  "Bureau",
  "Local commercial",
  "Entrepôt",
] as const;

export type ListingType = (typeof listingTypes)[number]["value"];
export type PricePeriod = (typeof pricePeriods)[number]["value"];

const optionalCount = (label: string, max: number) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || (/^\d{1,4}$/.test(value) && Number(value) <= max), `${label} : un nombre entier.`)
    .transform((value) => (value === "" ? null : Number(value)));

export const propertyDetailsSchema = z.object({
  propertyType: z.enum(propertyTypes, { message: "Choisissez le type de bien." }),
  surfaceM2: optionalCount("Surface", 1_000_000),
  bedrooms: optionalCount("Chambres", 100),
  bathrooms: optionalCount("Salles de bain", 100),
  furnished: z.boolean(),
  neighborhood: z.string().trim().max(120, "Le quartier ne peut pas dépasser 120 caractères."),
});

export type PropertyDetails = z.infer<typeof propertyDetailsSchema>;

export const listingFormSchema = z
  .object({
    listingType: z.enum(["SALE", "RENT"], { message: "Indiquez s’il s’agit d’une vente ou d’une location." }),
    pricePeriod: z.enum(["MONTH", "DAY", "YEAR", ""]).transform((value) => (value === "" ? null : value)),
    details: propertyDetailsSchema,
  })
  .superRefine((value, context) => {
    if (value.listingType === "RENT" && !value.pricePeriod) {
      context.addIssue({ code: "custom", path: ["pricePeriod"], message: "Indiquez s’il s’agit d’une location au mois, à l’année ou d’une réservation à la nuit." });
    }
  })
  .transform((value) => ({ ...value, pricePeriod: value.listingType === "RENT" ? value.pricePeriod : null }));

export type ListingInput = z.infer<typeof listingFormSchema>;

/** Lit les champs « annonce » d'un formulaire ; vente ou location vient de l'activité de la boutique. */
export function readListingForm(get: (key: string) => string, has: (key: string) => boolean, mode: ListingMode) {
  return listingFormSchema.safeParse({
    listingType: mode === "rent" ? "RENT" : "SALE",
    pricePeriod: get("pricePeriod"),
    details: {
      propertyType: get("propertyType"),
      surfaceM2: get("surfaceM2"),
      bedrooms: get("bedrooms"),
      bathrooms: get("bathrooms"),
      furnished: has("furnished"),
      neighborhood: get("neighborhood"),
    },
  });
}

/** Détails enregistrés (JSON) relus sans faire confiance à leur forme. */
export function storedPropertyDetails(value: unknown): PropertyDetails | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const text = (input: unknown) => (input === null || input === undefined ? "" : String(input));
  const parsed = propertyDetailsSchema.safeParse({
    propertyType: raw.propertyType,
    surfaceM2: text(raw.surfaceM2),
    bedrooms: text(raw.bedrooms),
    bathrooms: text(raw.bathrooms),
    furnished: raw.furnished === true,
    neighborhood: text(raw.neighborhood),
  });
  return parsed.success ? parsed.data : null;
}

/** « / mois » après un loyer, rien pour une vente. */
export function priceSuffix(listingType: string | null | undefined, pricePeriod: string | null | undefined) {
  if (listingType !== "RENT") return "";
  return pricePeriods.find((period) => period.value === pricePeriod)?.short ?? "";
}

export function listingLabel(listingType: string | null | undefined, pricePeriod?: string | null) {
  if (listingType === "RENT" && pricePeriod === "DAY") return "À réserver";
  return listingTypes.find((type) => type.value === listingType)?.label ?? null;
}

/** Caractéristiques à afficher sur la fiche (cases grises, comme les caractéristiques de la maquette). */
export function propertyFacts(details: PropertyDetails | null) {
  if (!details) return [];
  const facts: { key: string; label: string; value: string }[] = [{ key: "type", label: "Type de bien", value: details.propertyType }];
  if (details.surfaceM2) facts.push({ key: "surface", label: "Surface", value: `${details.surfaceM2.toLocaleString("fr-FR")} m²` });
  if (details.bedrooms !== null) facts.push({ key: "bedrooms", label: "Chambres", value: String(details.bedrooms) });
  if (details.bathrooms !== null) facts.push({ key: "bathrooms", label: "Salles de bain", value: String(details.bathrooms) });
  if (!["Terrain", "Entrepôt"].includes(details.propertyType)) facts.push({ key: "furnished", label: "Ameublement", value: details.furnished ? "Meublé" : "Non meublé" });
  if (details.neighborhood) facts.push({ key: "neighborhood", label: "Quartier", value: details.neighborhood });
  return facts;
}
