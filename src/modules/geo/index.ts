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
