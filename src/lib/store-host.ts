// Boutiques en sous-domaine : mboa-style.prestafrik.com sert la vitrine /mboa-style (ADR-024).
// Module sans dépendance serveur : utilisé par src/proxy.ts et testé seul.

/** En-tête posé par le proxy sur la requête réécrite : la boutique est servie depuis son sous-domaine. */
export const subdomainStoreHeader = "x-prestafrik-subdomain";
/** En-têtes ajoutés par Cloudflare (règle de transformation) : hôte d'origine et clé partagée. */
export const forwardedStoreHostHeader = "x-prestafrik-store-host";
export const proxyKeyHeader = "x-prestafrik-proxy-key";

/** Sous-domaines qui ne sont jamais des boutiques. */
const platformSubdomains = new Set(["www", "app", "api", "admin", "mail", "webmail", "smtp", "imap", "ftp", "cpanel", "autodiscover", "autoconfig"]);
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

/**
 * Adresse de boutique contenue dans un nom d'hôte (« mboa-style.prestafrik.com » → « mboa-style »).
 * Null pour le domaine principal, un sous-domaine réservé ou un hôte étranger.
 */
export function storeSlugFromHost(host: string | null | undefined, rootDomain: string | null | undefined): string | null {
  if (!host || !rootDomain) return null;
  const hostname = host.trim().toLowerCase().replace(/\.$/, "");
  const root = rootDomain.trim().toLowerCase().replace(/^\.+|\.$/g, "");
  if (!root || !hostname.endsWith(`.${root}`)) return null;
  const sub = hostname.slice(0, -root.length - 1);
  if (sub.includes(".") || platformSubdomains.has(sub) || !slugPattern.test(sub)) return null;
  return sub;
}

/** Fichiers et routes techniques jamais réécrits (scripts, images, API, médias). */
export function isPassthroughPath(pathname: string) {
  return /^\/(?:_next|api|media|uploads)(?:\/|$)/.test(pathname) || /\.[a-z0-9]+$/i.test(pathname);
}

/** Chemin interne d'une page de boutique servie en sous-domaine : « /panier » → « /mboa-style/panier ». */
export function storeRewritePath(slug: string, pathname: string) {
  return pathname === "/" || pathname === "" ? `/${slug}` : `/${slug}${pathname}`;
}

/**
 * Lien vers une page de la boutique. `base` vaut « » quand la boutique est servie depuis son sous-domaine,
 * « /mboa-style » sur le domaine principal.
 */
export function storeHref(base: string, ...segments: string[]) {
  const path = [base, ...segments.map((segment) => segment.replace(/^\/+/, ""))].filter(Boolean).join("/");
  return path.startsWith("/") ? path : `/${path}`;
}
