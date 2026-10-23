"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { storeHref } from "@/lib/store-host";

const StoreBaseContext = createContext<string | null>(null);

/** Transmet aux composants de la vitrine le début de leurs liens (« » en sous-domaine, « /mboa-style » sinon). */
export function StoreLinksProvider({ base, children }: { base: string; children: ReactNode }) {
  return <StoreBaseContext.Provider value={base}>{children}</StoreBaseContext.Provider>;
}

/** `href()` → accueil de la boutique, `href("panier")` → son panier, quel que soit le domaine. */
export function useStoreHref(storeSlug: string) {
  const base = useContext(StoreBaseContext) ?? `/${storeSlug}`;
  return useCallback((...segments: string[]) => storeHref(base, ...segments), [base]);
}

/** Début des liens, pour retrouver la page courante dans l'adresse du navigateur. */
export function useStoreBase(storeSlug: string) {
  return useContext(StoreBaseContext) ?? `/${storeSlug}`;
}
