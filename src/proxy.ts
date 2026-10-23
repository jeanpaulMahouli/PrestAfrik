import { NextResponse, type NextRequest } from "next/server";
import {
  forwardedStoreHostHeader,
  isPassthroughPath,
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
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Jamais fourni par le visiteur : seul ce proxy le pose.
  headers.delete(subdomainStoreHeader);

  const slug = process.env.FEATURE_SUBDOMAINS === "true" ? requestedStore(request) : null;
  if (!slug || isPassthroughPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request: { headers } });
  }

  headers.set(subdomainStoreHeader, slug);
  const url = request.nextUrl.clone();
  url.pathname = storeRewritePath(slug, url.pathname);
  return NextResponse.rewrite(url, { request: { headers } });
}

function requestedStore(request: NextRequest) {
  const root = process.env.STORE_ROOT_DOMAIN;
  const secret = process.env.STORE_PROXY_SECRET;
  const forwarded = request.headers.get(forwardedStoreHostHeader);
  if (forwarded && secret && request.headers.get(proxyKeyHeader) === secret) {
    return storeSlugFromHost(forwarded, root);
  }
  return storeSlugFromHost(request.headers.get("host"), root);
}

export const config = {
  // Ni les fichiers du build ni les images optimisées : le proxy ne sert qu'aux pages.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
