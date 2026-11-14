// Recherche tolérante des produits (vitrines publiques et marketplace) : pas besoin de connaître le nom
// exact. Accents, majuscules et pluriels ignorés, début de mot accepté (« ordi » → ordinateur), fautes de
// frappe tolérées (« parfun », « chausure »), et quelques synonymes courants (pc ↔ ordinateur…).
// Module sans dépendance : utilisé côté serveur et testé unitairement.

/** Minuscules, sans accents ni ponctuation. */
export function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Singulier approximatif (« robes » → « robe », « bijoux » → « bijou », « chapeaux » → « chapeau »). */
function stem(word: string) {
  if (word.length > 4 && word.endsWith("aux")) return `${word.slice(0, -3)}al`;
  if (word.length > 3 && (word.endsWith("s") || word.endsWith("x")) && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

// Mots vides : ignorés dans la saisie.
const stopWords = new Set(["de", "des", "du", "la", "le", "les", "un", "une", "et", "en", "a", "au", "aux", "pour", "avec", "d", "l"]);

// Synonymes (forme normalisée et au singulier) : un mot de la recherche trouve aussi les autres.
const synonymGroups = [
  ["pc", "ordinateur", "laptop", "portable", "notebook", "macbook", "ordi"],
  ["telephone", "smartphone", "phone", "iphone", "samsung", "tecno", "infinix", "android", "mobile"],
  ["ecouteur", "airpod", "earbud", "casque", "oreillette"],
  ["chaussure", "basket", "sneaker", "tennis", "soulier", "escarpin", "talon", "mocassin", "babouche", "sandale"],
  ["parfum", "fragrance", "brume", "cologne"],
  ["sac", "sacoche", "pochette", "tote", "cabas"],
  ["montre", "smartwatch"],
  ["robe", "boubou", "kaba"],
  ["pagne", "wax", "tissu", "kente"],
  ["maquillage", "makeup", "gloss", "blush", "rouge"],
  ["savon", "gel", "douche"],
  ["creme", "lait", "lotion", "pommade", "serum"],
  ["tshirt", "tee", "maillot"],
  ["pantalon", "jean", "jogging"],
  ["perruque", "meche", "tissage", "greffe"],
  ["appartement", "studio", "chambre", "logement", "maison", "villa", "duplex"],
  ["voiture", "vehicule", "auto", "4x4"],
];
const synonyms = new Map<string, string[]>();
for (const group of synonymGroups) for (const word of group) synonyms.set(word, group);

/** Mots utiles d'une recherche (normalisés, au singulier). */
export function searchTokens(query: string) {
  return normalizeText(query)
    .split(" ")
    .filter((word) => word && !stopWords.has(word))
    .map(stem)
    .slice(0, 8);
}

/** Distance d'édition bornée (Damerau simplifiée : une inversion de deux lettres compte pour 1). */
function distance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous2: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, previous2[j - 2] + 1);
      current[j] = value;
      best = Math.min(best, value);
    }
    if (best > max) return max + 1;
    previous2 = previous;
    previous = current;
  }
  return previous[b.length];
}

const allowedTypos = (word: string) => (word.length >= 8 ? 2 : word.length >= 4 ? 1 : 0);

/** Score (0 à 1) d'un mot de la recherche contre un mot du texte. */
function wordScore(token: string, word: string) {
  if (word === token) return 1;
  if (word.startsWith(token) && token.length >= 2) return 0.9;
  if (token.length >= 4 && word.includes(token)) return 0.75;
  const typos = allowedTypos(token);
  if (typos && distance(token, word, typos) <= typos) return 0.7;
  // Début de mot avec une faute (« parfu » → parfum, « ordinatr » → ordinateur).
  if (typos && word.length > token.length && distance(token, word.slice(0, token.length), typos) <= typos) return 0.6;
  return 0;
}

/** Score d'un mot de la recherche contre une liste de mots, synonymes compris. */
function tokenScore(token: string, words: string[]) {
  let best = 0;
  for (const word of words) {
    best = Math.max(best, wordScore(token, word));
    if (best === 1) return 1;
  }
  const group = synonyms.get(token) ?? [...synonyms.entries()].find(([word]) => wordScore(token, word) >= 0.9)?.[1];
  if (group && best < 0.8) {
    for (const synonym of group) if (synonym !== token && words.includes(synonym)) best = Math.max(best, 0.8);
  }
  return best;
}

export type SearchField = { text: string | null | undefined; weight: number };

const wordsOf = (text: string) => normalizeText(text).split(" ").filter(Boolean).map(stem);

/**
 * Pertinence d'un élément pour une recherche (0 = ne correspond pas). Chaque mot de la recherche est cherché
 * dans les champs (nom, catégorie, description…) ; il faut retrouver tous les mots (2 sur 3 au-delà de
 * 2 mots). Les champs plus lourds (le nom) comptent davantage.
 */
export function searchScore(tokens: string[], fields: SearchField[]) {
  if (!tokens.length) return 1;
  const prepared = fields.filter((field) => field.text).map((field) => ({ words: wordsOf(field.text!), weight: field.weight }));
  let total = 0;
  let found = 0;
  for (const token of tokens) {
    let best = 0;
    for (const field of prepared) best = Math.max(best, tokenScore(token, field.words) * field.weight);
    if (best > 0) found++;
    total += best;
  }
  const needed = tokens.length <= 2 ? tokens.length : Math.ceil(tokens.length * 0.66);
  if (found < needed) return 0;
  return total / tokens.length;
}

/** Garde les éléments qui correspondent, du plus pertinent au moins pertinent (ordre d'origine à égalité). */
export function fuzzyRank<T>(items: T[], query: string, fields: (item: T) => SearchField[]) {
  const tokens = searchTokens(query);
  if (!tokens.length) return items;
  return items
    .map((item, index) => ({ item, index, score: searchScore(tokens, fields(item)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
