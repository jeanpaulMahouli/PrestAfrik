import cameroon from "@/config/geo/CM.json";

// Listes géographiques (brief §6.3) : régions et villes complètes pour le Cameroun ; les autres
// pays passent en saisie libre tant que leur jeu de données n'est pas fourni. Ajouter un pays =
// ajouter un fichier `config/geo/<ISO>.json` de même forme et l'enregistrer ici.

export type GeoRegion = { code: string; name: string; cities: string[] };
export type GeoCountry = { country: string; regions: GeoRegion[] };

const datasets: Record<string, GeoCountry> = { CM: cameroon };

/** Recherche insensible aux accents et à la casse. */
export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function hasGeoData(countryIso: string) {
  return countryIso in datasets;
}

export function getRegions(countryIso: string, query = ""): GeoRegion[] {
  const regions = datasets[countryIso]?.regions ?? [];
  const q = normalizeSearch(query);
  return regions.filter((region) => !q || normalizeSearch(region.name).includes(q)).slice(0, 50);
}

export function getCities(countryIso: string, regionCode: string, query = ""): string[] {
  const region = datasets[countryIso]?.regions.find((item) => item.code === regionCode);
  const q = normalizeSearch(query);
  return (region?.cities ?? []).filter((city) => !q || normalizeSearch(city).includes(q)).slice(0, 50);
}

export function geoDataset(countryIso: string) {
  return datasets[countryIso] ?? null;
}

/** Pays proposés partout (assistant, réglages) : seuls ceux dont la liste des villes existe. */
export const supportedCountries: readonly string[] = Object.keys(datasets);

/** Toutes les villes d'un pays, sans doublon, par ordre alphabétique. */
export function countryCities(countryIso: string): string[] {
  const cities = new Set((datasets[countryIso]?.regions ?? []).flatMap((region) => region.cities));
  return [...cities].sort((a, b) => a.localeCompare(b, "fr"));
}

/** La ville fait-elle partie de la liste du pays ? (les villes ne se saisissent jamais à la main) */
export function isKnownCity(countryIso: string, city: string) {
  return (datasets[countryIso]?.regions ?? []).some((region) => region.cities.includes(city));
}
