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

export const countryPages: CountryPage[] = [
  { slug: "cameroun", iso: "CM", name: "Cameroun", locative: "au Cameroun", cities: ["Douala", "Yaoundé", "Bafoussam", "Garoua"], ready: false },
  { slug: "cote-d-ivoire", iso: "CI", name: "Côte d’Ivoire", locative: "en Côte d’Ivoire", cities: ["Abidjan", "Bouaké", "Yamoussoukro"], ready: false },
  { slug: "senegal", iso: "SN", name: "Sénégal", locative: "au Sénégal", cities: ["Dakar", "Thiès", "Saint-Louis"], ready: false },
  { slug: "gabon", iso: "GA", name: "Gabon", locative: "au Gabon", cities: ["Libreville", "Port-Gentil", "Franceville"], ready: false },
  { slug: "benin", iso: "BJ", name: "Bénin", locative: "au Bénin", cities: ["Cotonou", "Porto-Novo", "Parakou"], ready: false },
  { slug: "togo", iso: "TG", name: "Togo", locative: "au Togo", cities: ["Lomé", "Kara", "Sokodé"], ready: false },
];

export const findCountryPage = (slug: string) => countryPages.find((page) => page.slug === slug);
