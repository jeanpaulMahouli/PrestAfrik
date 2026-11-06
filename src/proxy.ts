import { NextResponse, type NextRequest } from "next/server";
import {
  appSubdomain,
  forwardedStoreHostHeader,
  isAppHost,
  isAppPath,
  isMarketplaceHost,
  isMarketplacePath,
  isPassthroughPath,
  marketplaceBasePath,
  marketplacePublicPath,
  marketplaceRewritePath,
  proxyKeyHeader,
  storeRewritePath,
  storeSlugFromHost,
  subdomainStoreHeader,
} from "@/lib/store-host";

/**
 * Boutiques en sous-domaine (FEATURE_SUBDOMAINS, ADR-024) : mboa-style.prestafrik.com/panier affiche
 * la page /mboa-style/panier, l'adresse du navigateur ne change pas.
 *
 * L'hôte vient soit de l'en-tête Host (serveur qui reçoit directement *.prestafrik.com), soit de
 * l'en-tête posé par Cloudflare quand celui-ci réécrit Host vers le domaine principal (hébergement
 * Hostinger). Ce second en-tête n'est accepté qu'avec la clé partagée STORE_PROXY_SECRET.
 *
 * La marketplace est l'accueil de prestafrik.com : « / » et « /recherche » affichent les pages de
 * app/nos-boutiques. L'ancien shop.prestafrik.com/… redirige en 301 vers prestafrik.com/… (même chemin),
 * l'ancienne adresse prestafrik.com/nos-boutiques/… aussi. La présentation pour les vendeurs est sur /boutique.
 *
 * Les espaces connectés ont le leur : app.prestafrik.com/dashboard (tableau de bord), /admin et
 * /boutiques/nouvelle ; prestafrik.com/dashboard/… y est redirigé, app.prestafrik.com/ ouvre le tableau
 * de bord. Le cookie de session est commun à tous les sous-domaines (modules/auth/server.ts).
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Jamais fourni par le visiteur : seul ce proxy le pose.
  headers.delete(subdomainStoreHeader);

  const subdomains = process.env.FEATURE_SUBDOMAINS === "true";
  const root = process.env.STORE_ROOT_DOMAIN;
  const pathname = request.nextUrl.pathname;
  // Protocole du site (derrière Cloudflare, la requête reçue peut être en http).
  const protocol = (process.env.BETTER_AUTH_URL ?? "").startsWith("http://") ? "http:" : "https:";
  const host = subdomains && root ? requestedHost(request) : null;

  // Ancienne marketplace shop.prestafrik.com : chaque adresse redirige en 301 vers la même page sur
  // prestafrik.com (chemin et paramètres conservés), en une seule étape. Les appels d'API en cours restent servis.
  if (root && isMarketplaceHost(host, root) && !/^\/api(?:\/|$)/.test(pathname)) {
    const target = new URL(`${protocol}//${root}`);
    target.pathname = pathname;
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target, request.method === "GET" || request.method === "HEAD" ? 301 : 308);
  }

  // Ancienne adresse interne prestafrik.com/nos-boutiques/… → la page publique (« / », « /recherche »).
  if (pathname === marketplaceBasePath || pathname.startsWith(`${marketplaceBasePath}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = marketplacePublicPath(pathname);
    return NextResponse.redirect(url, 308);
  }

  if (subdomains && root && !isPassthroughPath(pathname)) {
    const url = request.nextUrl.clone();
    if (isAppHost(host, root)) {
      // app.prestafrik.com : le tableau de bord ; les autres pages (connexion, aperçu des boutiques…) restent servies.
      if (pathname === "/") {
        url.pathname = "/dashboard";
        return NextResponse.redirect(url, 307);
      }
      // Espace connecté : jamais dans les résultats de recherche (les pages publiques ont leur adresse sur prestafrik.com).
      return withNoIndex(NextResponse.next({ request: { headers } }));
    }
    if (isAppPath(pathname)) {
      const target = new URL(`${protocol}//${appSubdomain}.${root}`);
      target.pathname = pathname;
      target.search = request.nextUrl.search;
      return NextResponse.redirect(target, 307);
    }
  }

  const slug = subdomains ? requestedStore(request) : null;
  if (!slug) {
    // Domaine principal : la marketplace est l'accueil (« / ») et sa recherche est « /recherche ».
    if (isMarketplacePath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = marketplaceRewritePath(pathname);
      return NextResponse.rewrite(url, { request: { headers } });
    }
    return NextResponse.next({ request: { headers } });
  }
  if (isPassthroughPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request: { headers } });
  }

  headers.set(subdomainStoreHeader, slug);
  const url = request.nextUrl.clone();
  url.pathname = storeRewritePath(slug, url.pathname);
  // Boutiques publiques non indexées (en plus de la balise robots des pages) : seuls prestafrik.com et la
  // marketplace apparaissent dans Google. Les liens restent suivis (vers PrestAfrik).
  return withNoIndex(NextResponse.rewrite(url, { request: { headers } }));
}

function withNoIndex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, follow");
  return response;
}

/** Hôte demandé par le visiteur : en-tête Host, ou celui transmis par Cloudflare avec la clé partagée. */
function requestedHost(request: NextRequest) {
  const secret = process.env.STORE_PROXY_SECRET;
  const forwarded = request.headers.get(forwardedStoreHostHeader);
  if (forwarded && secret && request.headers.get(proxyKeyHeader) === secret) return forwarded;
  return request.headers.get("host") ?? request.nextUrl.host;
}

function requestedStore(request: NextRequest) {
  return storeSlugFromHost(requestedHost(request), process.env.STORE_ROOT_DOMAIN);
}

export const config = {
  // Ni les fichiers du build ni les images optimisées : le proxy ne sert qu'aux pages.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
