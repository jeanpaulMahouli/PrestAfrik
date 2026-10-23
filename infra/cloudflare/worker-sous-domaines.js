// Worker Cloudflare des boutiques en sous-domaine (docs/sous-domaines.md, ADR-024).
// Route : *.prestafrik.com/*  —  Variables : ORIGIN (https://prestafrik.com), STORE_PROXY_SECRET (secret).
//
// Hostinger ne sert l'application qu'au nom prestafrik.com : le Worker relaie chaque requête de
// mboa-style.prestafrik.com vers prestafrik.com en indiquant l'hôte d'origine. src/proxy.ts affiche
// alors la boutique ; l'adresse du navigateur reste mboa-style.prestafrik.com.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = new URL(env.ORIGIN);

    // www.prestafrik.com → prestafrik.com
    if (url.hostname === `www.${origin.hostname}`) {
      return Response.redirect(`${origin.origin}${url.pathname}${url.search}`, 301);
    }

    const headers = new Headers(request.headers);
    headers.set("x-prestafrik-store-host", url.host);
    headers.set("x-prestafrik-proxy-key", env.STORE_PROXY_SECRET);

    const init = { method: request.method, headers, redirect: "manual" };
    if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;

    return fetch(new URL(url.pathname + url.search, origin), init);
  },
};
