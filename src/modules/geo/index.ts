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

/** Libellé commun des boutiques et comptes sans ville connue (tableaux de bord de l'administration). */
export const unknownCityLabel = "Ville non renseignée";

let cityIndex: Map<string, string> | null = null;

/** « yaounde » → « Yaoundé » pour toutes les villes connues (tous pays ; le premier pays listé l'emporte). */
function knownCities() {
  if (!cityIndex) {
    cityIndex = new Map();
    for (const dataset of Object.values(datasets)) {
      for (const region of dataset.regions) for (const city of region.cities) if (!cityIndex.has(normalizeSearch(city))) cityIndex.set(normalizeSearch(city), city);
    }
  }
  return cityIndex;
}

/**
 * Ville telle qu'elle doit s'afficher et se compter partout : « douala », « DOUALA » et « Douala  » donnent
 * « Douala », « Yaounde » donne « Yaoundé ». Les villes hors liste gardent leur écriture (espaces nettoyés,
 * première lettre en majuscule). null si la ville est vide.
 */
export function canonicalCity(city: string | null | undefined): string | null {
  const value = city?.replace(/\s+/g, " ").trim();
  if (!value) return null;
  const known = knownCities().get(normalizeSearch(value));
  if (known) return known;
  return value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);
}

/** Ville d'affichage, ou « Ville non renseignée ». */
export function cityLabel(city: string | null | undefined) {
  return canonicalCity(city) ?? unknownCityLabel;
}

/**
 * Ville d'un utilisateur, croisée avec ses boutiques : la ville la plus fréquente parmi les boutiques dont il
 * est propriétaire, sinon parmi toutes ses boutiques (à égalité : la plus ancienne). Les boutiques doivent être
 * données de la plus ancienne à la plus récente.
 */
export function userCityFromStores(stores: { city: string | null; owner: boolean }[]): string | null {
  const pick = (list: typeof stores) => {
    const counts = new Map<string, number>();
    for (const store of list) {
      const city = canonicalCity(store.city);
      if (city) counts.set(city, (counts.get(city) ?? 0) + 1);
    }
    let best: string | null = null;
    for (const [city, count] of counts) if (!best || count > (counts.get(best) ?? 0)) best = city;
    return best;
  };
  return pick(stores.filter((store) => store.owner)) ?? pick(stores);
}

/** La ville fait-elle partie de la liste du pays ? (les villes ne se saisissent jamais à la main) */
export function isKnownCity(countryIso: string, city: string) {
  return (datasets[countryIso]?.regions ?? []).some((region) => region.cities.includes(city));
}
