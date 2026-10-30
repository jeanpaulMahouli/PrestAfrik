// Adresse de boutique (brief §6.3, étape 1) : 3 à 40 caractères, minuscules, chiffres et tirets,
// ni tiret en début ni en fin, unique, hors noms réservés. La boutique est servie sur prestafrik.com/{adresse}.

export const slugPattern = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export const reservedSlugs = new Set([
  "admin", "administration", "api", "app", "www", "mail", "email", "smtp", "dev", "test", "staging",
  "boutique", "boutiques", "connexion", "inscription", "deconnexion", "suivi", "commande", "commandes",
  "static", "assets", "media", "uploads", "public", "support", "aide", "help", "contact", "blog", "shop",
  "store", "ftp", "webhook", "webhooks", "status", "dashboard", "compte", "profil", "legal", "cgu",
  "confidentialite", "prestafrik", "paiement", "paiements", "abonnement", "factures", "docs", "cdn",
  "login", "logout", "signup", "register", "auth", "root", "system", "null", "undefined",
  // Les boutiques sont servies à la racine (prestafrik.com/{adresse}) : toutes les pages et dossiers
  // publics du site sont réservés, ainsi que des mots susceptibles de servir plus tard.
  "invitations", "invitation", "mot-de-passe-oublie", "reinitialiser", "brand", "landing", "favicon-ico",
  "icon", "apple-icon", "robots", "sitemap", "manifest", "next", "tarifs", "prix", "fonctionnalites",
  "a-propos", "demo", "equipe", "recherche", "panier", "nouvelle", "parametres", "messages", "marketing",
  "livraisons", "produits", "clients", "argent", "mentions-legales", "conditions-generales",
  "politique-de-confidentialite", "conditions-de-vente", "apercu-boutique", "apercu", "confirmer-adresse", "pays", "aide", "tarifs", "nos-boutiques",
]);

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export type SlugIssue = "format" | "reserved";

export function checkSlug(slug: string): SlugIssue | null {
  if (!slugPattern.test(slug) || slug.includes("--")) return "format";
  if (reservedSlugs.has(slug)) return "reserved";
  return null;
}

export const slugMessages: Record<SlugIssue | "taken", string> = {
  format: "3 à 40 caractères : lettres minuscules, chiffres et tirets, sans espace ni tiret au début ou à la fin.",
  reserved: "Cette adresse est réservée par PrestAfrik. Choisissez-en une autre.",
  taken: "Cette adresse est déjà prise. Essayez l’une des suggestions.",
};

/** Propositions d'adresses à partir du nom et de la ville (filtrées ensuite selon leur disponibilité). */
export function slugSuggestions(base: string, city?: string | null) {
  const slug = slugify(base);
  const citySlug = city ? slugify(city) : "";
  const compact = slug.replace(/-/g, "");
  const firstWord = slug.split("-")[0] ?? slug;
  const candidates = [
    citySlug ? `${slug}-${citySlug}` : `${slug}-boutique`,
    compact,
    `${firstWord}-shop`,
    `${slug}-cm`,
    `${slug}-officiel`,
    `ma-${slug}`,
  ];
  return [...new Set(candidates.map((candidate) => candidate.slice(0, 40).replace(/-+$/g, "")))].filter((candidate) => candidate !== slug && !checkSlug(candidate));
}
