import "server-only";
import { headers } from "next/headers";
import { subdomainStoreHeader } from "@/lib/store-host";

/**
 * Début des liens internes d'une boutique : « » quand la page est servie depuis son sous-domaine
 * (mboa-style.prestafrik.com/panier), « /mboa-style » sur le domaine principal (prestafrik.com/mboa-style/panier).
 */
export async function storeBasePath(slug: string) {
  return (await headers()).get(subdomainStoreHeader) === slug ? "" : `/${slug}`;
}
