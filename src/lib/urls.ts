// Adresses publiques. Pour l'instant : /boutique/[slug] (brief §6.5) ; les sous-domaines sont
// préparés derrière FEATURE_SUBDOMAINS mais désactivés.

export function appBaseUrl() {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function storePublicUrl(slug: string) {
  if (process.env.FEATURE_SUBDOMAINS === "true" && process.env.STORE_ROOT_DOMAIN) {
    return `https://${slug}.${process.env.STORE_ROOT_DOMAIN}`;
  }
  return `${appBaseUrl()}/boutique/${slug}`;
}

export function trackingUrl(token: string) {
  return `${appBaseUrl()}/commande/suivi/${encodeURIComponent(token)}`;
}
