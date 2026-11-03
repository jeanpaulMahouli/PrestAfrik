"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/** Navigation plus rapide que ce délai : la page vient du cache du navigateur (préchargée). */
const instantMs = 250;
/** Retour sur l'onglet ou l'application après cette absence : données relues. */
const awayMs = 60_000;

/**
 * Espace vendeur et administration : les rubriques sont préchargées (Link prefetch) et s'affichent
 * instantanément depuis le cache. Pour rester synchrone avec la base, la page affichée est relue en
 * arrière-plan juste après (router.refresh, sans écran de chargement : le contenu se met à jour en place),
 * ainsi qu'au retour sur l'application après une absence.
 */
export function FreshOnNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const clickedAt = useRef<number | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (link instanceof HTMLAnchorElement && link.origin === window.location.origin && link.target !== "_blank") clickedAt.current = performance.now();
    };
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > awayMs) router.refresh();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const started = clickedAt.current;
    clickedAt.current = null;
    // Page servie par le cache : relecture discrète des données (la page reste affichée et utilisable).
    if (started !== null && performance.now() - started < instantMs) router.refresh();
  }, [routeKey, router]);

  return null;
}
