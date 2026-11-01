import "server-only";

import { cookies, headers } from "next/headers";
import { findCity, shopCityCookie, shopUniverseCookie, shopUniverseKeys, type ShopCity, type ShopUniverse } from "@/config/marketplace";

/**
 * Ce que le visiteur cherche sur la marketplace : un univers (vente, immobilier, services) et une ville
 * du Cameroun. `chosen` est faux tant que le visiteur n'a pas choisi d'univers (fenêtre d'accueil).
 */
export type ShopScope = { universe: ShopUniverse; city: ShopCity | null; chosen: boolean; detected: boolean };

/**
 * Univers et ville du visiteur : son choix (cookies), sinon la ville de sa connexion transmise par
 * Cloudflare (en-tête CF-IPCity, aucune donnée gardée). Ville inconnue : tout le Cameroun.
 */
export async function getShopScope(): Promise<ShopScope> {
  const store = await cookies();
  const rawUniverse = store.get(shopUniverseCookie)?.value as ShopUniverse | undefined;
  const universe = rawUniverse && shopUniverseKeys.includes(rawUniverse) ? rawUniverse : "vente";
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
  return { universe, city, chosen: Boolean(rawUniverse), detected };
}

/** Clé de cache d'un périmètre (univers et ville). */
export const scopeKey = (scope: Pick<ShopScope, "universe" | "city">) => `${scope.universe}:${scope.city?.name ?? "CM"}`;
