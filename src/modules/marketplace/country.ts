import "server-only";

import { cookies, headers } from "next/headers";
import { countryPages } from "@/config/country-pages";

/** Choix du pays fait par le visiteur sur la marketplace (« CM », « GA »… ou « CEMAC » pour toute la zone). */
export const shopCountryCookie = "shop_pays";

export type ShopCountry = { iso: string; name: string; locative: string } | null;

const cemac = new Map(countryPages.map((page) => [page.iso, { iso: page.iso, name: page.name, locative: page.locative }]));

/**
 * Pays du visiteur de la marketplace : son choix (cookie), sinon le pays de sa connexion transmis par
 * Cloudflare (en-tête CF-IPCountry, aucune donnée gardée). Null hors zone CEMAC ou si inconnu : la
 * marketplace montre alors toute la zone.
 */
export async function getShopCountry(): Promise<ShopCountry> {
  const chosen = (await cookies()).get(shopCountryCookie)?.value?.toUpperCase();
  if (chosen === "CEMAC") return null;
  if (chosen && cemac.has(chosen)) return cemac.get(chosen)!;
  const header = await headers();
  const detected = (header.get("cf-ipcountry") ?? header.get("x-vercel-ip-country") ?? "").toUpperCase();
  return cemac.get(detected) ?? null;
}

export const shopCountries = [...cemac.values()];
