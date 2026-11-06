// Suivi des publicités : les paramètres de campagne (utm_*, fbclid, ttclid, gclid…) du lien publicitaire
// sont gardés pendant tout le parcours « accueil → /boutique → inscription → création de la boutique »,
// et les événements GA4 sont envoyés quand Google Analytics est installé (NEXT_PUBLIC_GA_ID).
// Module sans dépendance serveur : utilisé dans le navigateur et testé seul.

/** Paramètres publicitaires conservés. */
export const attributionKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id", "fbclid", "ttclid", "gclid", "gbraid", "wbraid", "msclkid"] as const;

/** Cookie partagé par prestafrik.com et ses sous-domaines (app.prestafrik.com, où la boutique est créée). */
export const attributionCookie = "pa_attribution";

/** Chemins des pages vendeurs qui reçoivent les paramètres : « Devenir vendeur » et inscription. */
export const sellerFunnelPaths = ["/boutique", "/inscription"];

export type Attribution = Partial<Record<(typeof attributionKeys)[number], string>>;

/** Paramètres publicitaires présents dans une adresse (« ?utm_source=facebook&… »). */
export function readAttribution(search: string): Attribution {
  const params = new URLSearchParams(search);
  const found: Attribution = {};
  for (const key of attributionKeys) {
    const value = params.get(key)?.trim();
    if (value) found[key] = value.slice(0, 200);
  }
  return found;
}

/** Ajoute les paramètres à un lien, sans écraser ceux qu'il porte déjà. */
export function withAttribution(href: string, attribution: Attribution, base = "https://prestafrik.com") {
  const entries = Object.entries(attribution);
  if (!entries.length) return href;
  const url = new URL(href, base);
  for (const [key, value] of entries) if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  const absolute = /^https?:\/\//.test(href);
  return absolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
}

/** Vrai si le lien mène à une page du parcours vendeur (« /boutique », « /inscription »). */
export function isSellerFunnelHref(href: string, base = "https://prestafrik.com") {
  try {
    const { pathname } = new URL(href, base);
    return sellerFunnelPaths.includes(pathname.replace(/\/$/, "") || "/");
  } catch {
    return false;
  }
}
