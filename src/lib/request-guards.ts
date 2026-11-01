import "server-only";
import { appSubdomain, forwardedStoreHostHeader, marketplaceSubdomain, proxyKeyHeader } from "@/lib/store-host";

const normalize = (host: string) => host.trim().toLowerCase().replace(/\.$/, "");
/** Premier élément d'un en-tête qui peut contenir une liste (« a.com, b.com »). */
const first = (value: string | null) => value?.split(",")[0]?.trim() || null;

/**
 * Hôtes acceptés comme origine : celui de la requête (Host, X-Forwarded-Host, ou l'hôte d'origine transmis
 * par Cloudflare avec la clé partagée), celui de BETTER_AUTH_URL et, sous-domaines activés, le domaine
 * principal, www, app et shop. Derrière Cloudflare, Host est réécrit vers le domaine principal alors que le
 * navigateur envoie « Origin: https://app.prestafrik.com » : sans cette liste, tout envoi était refusé.
 */
function allowedHosts(request: Request) {
  const hosts = new Set<string>();
  const add = (value: string | null | undefined) => {
    if (value) hosts.add(normalize(value));
  };
  add(first(request.headers.get("host")));
  add(first(request.headers.get("x-forwarded-host")));
  const secret = process.env.STORE_PROXY_SECRET;
  if (secret && request.headers.get(proxyKeyHeader) === secret) add(first(request.headers.get(forwardedStoreHostHeader)));
  try {
    if (process.env.BETTER_AUTH_URL) add(new URL(process.env.BETTER_AUTH_URL).host);
  } catch {
    // URL invalide : ignorée (la configuration est vérifiée au démarrage).
  }
  const root = process.env.FEATURE_SUBDOMAINS === "true" ? process.env.STORE_ROOT_DOMAIN?.trim().replace(/^\.+/, "") : undefined;
  if (root) for (const sub of ["", "www.", `${appSubdomain}.`, `${marketplaceSubdomain}.`]) add(`${sub}${root}`);
  return hosts;
}

/**
 * Protection CSRF des Route Handlers qui modifient des données (brief §8) : l'en-tête Origin doit
 * désigner un hôte de la plateforme (les Server Actions ont déjà cette vérification intégrée).
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    return allowedHosts(request).has(normalize(new URL(origin).host));
  } catch {
    return false;
  }
}
