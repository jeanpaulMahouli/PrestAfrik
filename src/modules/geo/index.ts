import cm from "@/config/geo/CM.json";
import ga from "@/config/geo/GA.json";
import cg from "@/config/geo/CG.json";
import td from "@/config/geo/TD.json";
import cf from "@/config/geo/CF.json";
import gq from "@/config/geo/GQ.json";
import bj from "@/config/geo/BJ.json";
import bf from "@/config/geo/BF.json";
import ci from "@/config/geo/CI.json";
import gw from "@/config/geo/GW.json";
import ml from "@/config/geo/ML.json";
import ne from "@/config/geo/NE.json";
import sn from "@/config/geo/SN.json";
import tg from "@/config/geo/TG.json";

// Listes géographiques (brief §6.3) : les 14 pays du franc CFA (FCFA), régions et principales villes.
// Afrique centrale (CEMAC) : Cameroun, Gabon, Congo, Tchad, Centrafrique, Guinée équatoriale ;
// Afrique de l’Ouest (UEMOA) : Bénin, Burkina Faso, Côte d’Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo.
// Pays, région et ville se choisissent toujours dans ces listes. Ajouter un pays = ajouter un fichier
// `config/geo/<ISO>.json` de même forme et l’enregistrer ici.

export type GeoRegion = { code: string; name: string; cities: string[] };
export type GeoCountry = { country: string; regions: GeoRegion[] };

const datasets: Record<string, GeoCountry> = { CM: cm, GA: ga, CG: cg, TD: td, CF: cf, GQ: gq, BJ: bj, BF: bf, CI: ci, GW: gw, ML: ml, NE: ne, SN: sn, TG: tg };

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
