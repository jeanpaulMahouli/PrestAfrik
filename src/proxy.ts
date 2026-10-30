import { NextResponse, type NextRequest } from "next/server";
import {
  forwardedStoreHostHeader,
  isMarketplaceHost,
  isPassthroughPath,
  marketplaceBasePath,
  marketplaceRewritePath,
  marketplaceSubdomain,
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
 * La marketplace a son propre sous-domaine réservé : shop.prestafrik.com/recherche affiche la page
 * /nos-boutiques/recherche ; prestafrik.com/nos-boutiques/… redirige vers shop.prestafrik.com/….
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Jamais fourni par le visiteur : seul ce proxy le pose.
  headers.delete(subdomainStoreHeader);

  const subdomains = process.env.FEATURE_SUBDOMAINS === "true";
  const root = process.env.STORE_ROOT_DOMAIN;
  const pathname = request.nextUrl.pathname;
  if (subdomains && root && !isPassthroughPath(pathname)) {
    const url = request.nextUrl.clone();
    if (isMarketplaceHost(requestedHost(request), root)) {
      url.pathname = marketplaceRewritePath(pathname);
      return NextResponse.rewrite(url, { request: { headers } });
    }
    if (pathname === marketplaceBasePath || pathname.startsWith(`${marketplaceBasePath}/`)) {
      // Protocole du site (derrière Cloudflare, la requête reçue peut être en http).
      const protocol = (process.env.BETTER_AUTH_URL ?? "").startsWith("http://") ? "http:" : "https:";
      const target = new URL(`${protocol}//${marketplaceSubdomain}.${root}`);
      target.pathname = pathname.slice(marketplaceBasePath.length) || "/";
      target.search = request.nextUrl.search;
      return NextResponse.redirect(target, 308);
    }
  }

  const slug = subdomains ? requestedStore(request) : null;
  if (!slug || isPassthroughPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request: { headers } });
  }

  headers.set(subdomainStoreHeader, slug);
  const url = request.nextUrl.clone();
  url.pathname = storeRewritePath(slug, url.pathname);
  return NextResponse.rewrite(url, { request: { headers } });
}

/** Hôte demandé par le visiteur : en-tête Host, ou celui transmis par Cloudflare avec la clé partagée. */
function requestedHost(request: NextRequest) {
  const secret = process.env.STORE_PROXY_SECRET;
  const forwarded = request.headers.get(forwardedStoreHostHeader);
  if (forwarded && secret && request.headers.get(proxyKeyHeader) === secret) return forwarded;
  return request.headers.get("host");
}

function requestedStore(request: NextRequest) {
  return storeSlugFromHost(requestedHost(request), process.env.STORE_ROOT_DOMAIN);
}

export const config = {
  // Ni les fichiers du build ni les images optimisées : le proxy ne sert qu'aux pages.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
