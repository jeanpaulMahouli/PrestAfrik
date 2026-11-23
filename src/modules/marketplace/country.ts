import "server-only";

import { cookies, headers } from "next/headers";
import { findCity, shopCityCookie, type ShopCity } from "@/config/marketplace";

/** Ville du visiteur sur la marketplace (« Livrer à »), ou tout le Cameroun. */
export type ShopScope = { city: ShopCity | null; detected: boolean };

/**
 * Ville du visiteur : son choix (cookies), sinon la ville de sa connexion transmise par
 * Cloudflare (en-tête CF-IPCity, aucune donnée gardée). Ville inconnue : tout le Cameroun.
 */
export async function getShopScope(): Promise<ShopScope> {
  const store = await cookies();
  const chosenCity = store.get(shopCityCookie)?.value;
  let city: ShopCity | null = null;
  let detected = false;
  if (chosenCity === "CM") city = null;
  else if (chosenCity) city = findCity(decodeURIComponent(chosenCity));
  else {
    const header = await headers();
    city = findCity(header.get("cf-ipcity") ?? header.get("x-vercel-ip-city"));
    detected = Boolean(city);
  }
  return { city, detected };
}

/** Clé de cache d'un périmètre (ville). */
export const scopeKey = (scope: Pick<ShopScope, "city">) => scope.city?.name ?? "CM";
