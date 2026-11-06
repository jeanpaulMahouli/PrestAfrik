// Adresses publiques : la marketplace est l'accueil de prestafrik.com, la présentation pour les vendeurs est
// sur prestafrik.com/boutique, et chaque boutique est à la racine du site, prestafrik.com/{adresse}.
// Les anciens liens /boutique/{adresse}/… redirigent vers la nouvelle adresse (next.config.ts).
// Avec FEATURE_SUBDOMAINS=true et STORE_ROOT_DOMAIN, l'adresse partagée devient {adresse}.prestafrik.com
// (src/proxy.ts, ADR-024) ; prestafrik.com/{adresse} continue de fonctionner.

export function appBaseUrl() {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function subdomainsEnabled() {
  return process.env.FEATURE_SUBDOMAINS === "true" && Boolean(process.env.STORE_ROOT_DOMAIN);
}

/** Forme de l'adresse affichée au vendeur : « {adresse}.prestafrik.com » ou « prestafrik.com/{adresse} ». */
export function storeAddressFormat(): { prefix: string; suffix: string } {
  if (subdomainsEnabled()) return { prefix: "", suffix: `.${process.env.STORE_ROOT_DOMAIN}` };
  return { prefix: `${new URL(appBaseUrl()).host}/`, suffix: "" };
}

/** Adresse lisible d'une boutique, sans « https:// » (messages, récapitulatifs). */
export function storeAddressLabel(slug: string) {
  const { prefix, suffix } = storeAddressFormat();
  return `${prefix}${slug}${suffix}`;
}

export function storePublicUrl(slug: string) {
  if (subdomainsEnabled()) {
    const protocol = appBaseUrl().startsWith("http://") ? "http" : "https";
    return `${protocol}://${slug}.${process.env.STORE_ROOT_DOMAIN}`;
  }
  return `${appBaseUrl()}${storePath(slug)}`;
}

/**
 * Adresse d'une page de la marketplace, servie à la racine de prestafrik.com : « / » (accueil),
 * « /recherche?… ». Le proxy (src/proxy.ts) sert ces chemins avec les pages de app/nos-boutiques ;
 * l'ancien shop.prestafrik.com redirige en 301 vers la même page sur prestafrik.com.
 * Pour une adresse complète (canonique, sitemap, partage), passer le résultat dans absoluteUrl().
 */
export function shopUrl(path = "/") {
  return path.startsWith("/") ? path : `/${path}`;
}

/** Page de présentation pour les vendeurs (« Devenir vendeur »), sur le domaine principal. */
export const sellerLandingPath = "/boutique";

/** Chemin d'une page de la boutique sur le site (« /mboa-style », « /mboa-style/panier »…). */
export function storePath(slug: string, ...segments: string[]) {
  return ["", slug, ...segments].join("/");
}

export function trackingUrl(token: string) {
  return `${appBaseUrl()}/commande/suivi/${encodeURIComponent(token)}`;
}
