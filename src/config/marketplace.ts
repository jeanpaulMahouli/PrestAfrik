// Marketplace : univers (vente, immobilier, services) et grandes villes du Cameroun (choix « Livrer à »).
// Fichier sans dépendance serveur : utilisé par les pages et par les composants du navigateur.

export const shopUniverses = {
  vente: { label: "Shopping", short: "Shopping", text: "Mode, beauté, maison, téléphones…" },
  immobilier: { label: "Immobilier", short: "Immobilier", text: "Maisons, appartements, terrains, bureaux" },
  services: { label: "Services", short: "Services", text: "Coiffure, réparation, événementiel, transport…" },
} as const;

export type ShopUniverse = keyof typeof shopUniverses;
export const shopUniverseKeys = Object.keys(shopUniverses) as ShopUniverse[];
export const shopUniverseCookie = "shop_univers";
export const shopCityCookie = "shop_ville";

/** Univers d'une boutique, d'après son activité. */
export function universeOfActivity(slug: string | null | undefined): ShopUniverse {
  if (slug === "immobilier") return "immobilier";
  if (slug === "services") return "services";
  return "vente";
}

export type ShopCity = { name: string; region: string; lat: number; lng: number };

/** Grandes villes du Cameroun, par région (coordonnées approximatives : choix de la ville la plus proche). */
export const cameroonCities: ShopCity[] = [
  { name: "Douala", region: "Littoral", lat: 4.0511, lng: 9.7679 },
  { name: "Edéa", region: "Littoral", lat: 3.8, lng: 10.1333 },
  { name: "Nkongsamba", region: "Littoral", lat: 4.9547, lng: 9.9404 },
  { name: "Yaoundé", region: "Centre", lat: 3.848, lng: 11.5021 },
  { name: "Mbalmayo", region: "Centre", lat: 3.5167, lng: 11.5 },
  { name: "Obala", region: "Centre", lat: 4.1667, lng: 11.5333 },
  { name: "Bafoussam", region: "Ouest", lat: 5.4781, lng: 10.4176 },
  { name: "Dschang", region: "Ouest", lat: 5.4442, lng: 10.0531 },
  { name: "Foumban", region: "Ouest", lat: 5.7272, lng: 10.9017 },
  { name: "Mbouda", region: "Ouest", lat: 5.6262, lng: 10.2546 },
  { name: "Bamenda", region: "Nord-Ouest", lat: 5.9631, lng: 10.1591 },
  { name: "Kumbo", region: "Nord-Ouest", lat: 6.2, lng: 10.6667 },
  { name: "Buea", region: "Sud-Ouest", lat: 4.1527, lng: 9.241 },
  { name: "Limbé", region: "Sud-Ouest", lat: 4.0186, lng: 9.2043 },
  { name: "Kumba", region: "Sud-Ouest", lat: 4.6363, lng: 9.4469 },
  { name: "Ebolowa", region: "Sud", lat: 2.9, lng: 11.15 },
  { name: "Kribi", region: "Sud", lat: 2.9373, lng: 9.9077 },
  { name: "Sangmélima", region: "Sud", lat: 2.9333, lng: 11.9833 },
  { name: "Bertoua", region: "Est", lat: 4.5833, lng: 13.6833 },
  { name: "Batouri", region: "Est", lat: 4.4333, lng: 14.3667 },
  { name: "Ngaoundéré", region: "Adamaoua", lat: 7.3167, lng: 13.5833 },
  { name: "Meiganga", region: "Adamaoua", lat: 6.5167, lng: 14.3 },
  { name: "Garoua", region: "Nord", lat: 9.3, lng: 13.4 },
  { name: "Guider", region: "Nord", lat: 9.9333, lng: 13.95 },
  { name: "Maroua", region: "Extrême-Nord", lat: 10.591, lng: 14.3159 },
  { name: "Kousséri", region: "Extrême-Nord", lat: 12.0769, lng: 15.0306 },
  { name: "Mokolo", region: "Extrême-Nord", lat: 10.7397, lng: 13.8022 },
];

/** Comparaison sans accents ni majuscules (« yaounde » = « Yaoundé »). */
export const cityKey = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function findCity(name: string | null | undefined) {
  if (!name) return null;
  const key = cityKey(name);
  return cameroonCities.find((city) => cityKey(city.name) === key) ?? null;
}

/** Ville la plus proche d'une position (géolocalisation du navigateur). */
export function nearestCity(lat: number, lng: number) {
  let best = cameroonCities[0];
  let bestDistance = Infinity;
  for (const city of cameroonCities) {
    const distance = (city.lat - lat) ** 2 + ((city.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (distance < bestDistance) {
      best = city;
      bestDistance = distance;
    }
  }
  return best;
}
