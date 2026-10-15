"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationLoadingIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    setVisible(false);
    if (timer.current !== null) window.clearTimeout(timer.current);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    timer.current = null;
    hideTimer.current = null;
  }, [routeKey]);

  useEffect(() => {
    function showAfterDelay() {
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      timer.current = window.setTimeout(() => setVisible(true), 120);
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

      showAfterDelay();
    }

    function handleSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      // getAttribute : un champ nommé « method » ou « action » masquerait les propriétés du formulaire.
      const action = new URL(form.getAttribute("action") ?? "", window.location.href);
      if (action.origin !== window.location.origin) return;
      if ((form.getAttribute("method") ?? "get").toLowerCase() === "get" || action.pathname.startsWith("/api/")) {
        showAfterDelay();
      }
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div aria-busy="true" aria-live="polite" className="app-loading" role="status">
      <span aria-hidden="true" className="loading-spinner loading-spinner-page" />
      <p>Chargement de PrestAfrik…</p>
    </div>
  );
}
