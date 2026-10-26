"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationLoadingIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    setVisible(false);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = null;
  }, [routeKey]);

  useEffect(() => {
    // Affiché dès le clic : la barre répond tout de suite, le voile n'apparaît (en CSS) que si l'attente dure.
    function show() {
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      setVisible(true);
      hideTimer.current = window.setTimeout(() => setVisible(false), 15_000);
    }

    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) {
        return;
      }

      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;

      show();
    }

    function handleSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      // getAttribute : un champ nommé « method » ou « action » masquerait les propriétés du formulaire.
      const rawAction = form.getAttribute("action");
      // Formulaire géré en JavaScript (pas d'action réelle) : aucune navigation, pas de voile.
      if (!rawAction || rawAction.startsWith("javascript:")) return;
      const action = new URL(rawAction, window.location.href);
      if (action.origin !== window.location.origin) return;
      if ((form.getAttribute("method") ?? "get").toLowerCase() === "get" || action.pathname.startsWith("/api/")) {
        // Le gestionnaire React s'exécute après cet écouteur : on vérifie ensuite s'il a annulé l'envoi.
        window.setTimeout(() => {
          if (!event.defaultPrevented) show();
        }, 0);
      }
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div aria-busy="true" aria-live="polite" className="app-loading" role="status">
      <span aria-hidden="true" className="app-loading-veil" />
      <span aria-hidden="true" className="loading-spinner loading-spinner-page" />
      <p>Chargement en cours...</p>
    </div>
  );
}
