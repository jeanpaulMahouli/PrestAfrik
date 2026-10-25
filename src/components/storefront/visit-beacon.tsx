"use client";

import { useEffect } from "react";

/** Signale une visite de la boutique, une seule fois par visite (onglet), pour le tableau de bord du vendeur. */
export function VisitBeacon({ storeId, storeSlug }: { storeId: string; storeSlug: string }) {
  useEffect(() => {
    const key = `prestafrik-visite:${storeId}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Stockage indisponible : la visite est quand même comptée.
    }
    const url = `/api/boutique/${encodeURIComponent(storeSlug)}/visite`;
    if (!navigator.sendBeacon?.(url)) void fetch(url, { method: "POST", keepalive: true }).catch(() => undefined);
  }, [storeId, storeSlug]);
  return null;
}
