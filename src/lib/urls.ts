// Adresses publiques : chaque boutique est à la racine du site, prestafrik.com/{adresse}.
// Les anciens liens /boutique/{adresse}/… redirigent vers la nouvelle adresse (next.config.ts).
// Les sous-domaines sont préparés derrière FEATURE_SUBDOMAINS mais désactivés.

export function appBaseUrl() {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function storePublicUrl(slug: string) {
  if (process.env.FEATURE_SUBDOMAINS === "true" && process.env.STORE_ROOT_DOMAIN) {
    return `https://${slug}.${process.env.STORE_ROOT_DOMAIN}`;
  }
  return `${appBaseUrl()}${storePath(slug)}`;
}

/** Chemin d'une page de la boutique sur le site (« /mboa-style », « /mboa-style/panier »…). */
export function storePath(slug: string, ...segments: string[]) {
  return ["", slug, ...segments].join("/");
}

export function trackingUrl(token: string) {
  return `${appBaseUrl()}/commande/suivi/${encodeURIComponent(token)}`;
}
