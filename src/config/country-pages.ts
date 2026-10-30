// Pages par pays (/pays/[pays]) : gabarit commun, contenu propre à chaque pays à compléter.
// Tant que `ready` est faux, la page est accessible mais non indexée (texte générique seulement) et
// absente du plan du site.

export type CountryPage = {
  slug: string;
  /** Code ISO du pays (boutiques comptées par Store.country). */
  iso: string;
  name: string;
  /** « au Cameroun », « en Côte d'Ivoire »… */
  locative: string;
  cities: string[];
  ready: boolean;
};

// Zone CEMAC d'abord : PrestAfrik s'adresse à ses six pays.
export const countryPages: CountryPage[] = [
  { slug: "cameroun", iso: "CM", name: "Cameroun", locative: "au Cameroun", cities: ["Douala", "Yaoundé", "Bafoussam", "Garoua"], ready: false },
  { slug: "gabon", iso: "GA", name: "Gabon", locative: "au Gabon", cities: ["Libreville", "Port-Gentil", "Franceville"], ready: false },
  { slug: "congo", iso: "CG", name: "Congo", locative: "au Congo", cities: ["Brazzaville", "Pointe-Noire", "Dolisie"], ready: false },
  { slug: "tchad", iso: "TD", name: "Tchad", locative: "au Tchad", cities: ["N’Djamena", "Moundou", "Abéché"], ready: false },
  { slug: "centrafrique", iso: "CF", name: "République centrafricaine", locative: "en Centrafrique", cities: ["Bangui", "Bimbo", "Berbérati"], ready: false },
  { slug: "guinee-equatoriale", iso: "GQ", name: "Guinée équatoriale", locative: "en Guinée équatoriale", cities: ["Malabo", "Bata", "Ebebiyín"], ready: false },
];

export const findCountryPage = (slug: string) => countryPages.find((page) => page.slug === slug);
