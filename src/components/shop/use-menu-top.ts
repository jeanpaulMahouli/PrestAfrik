"use client";

import { useEffect } from "react";

/**
 * Listes déroulantes de l'en-tête sur téléphone (ville, univers) : affichées juste sous l'en-tête, même
 * quand la page a déjà défilé (l'en-tête est alors collé en haut et le bandeau du haut n'est plus visible).
 * Pose la position du bas de l'en-tête dans la variable CSS --sx-menu-top tant que la liste est ouverte.
 */
export function useMenuTop(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const place = () => {
      const header = document.querySelector(".shop .shop-header");
      const bottom = header ? header.getBoundingClientRect().bottom : 0;
      root.style.setProperty("--sx-menu-top", `${Math.max(0, Math.round(bottom)) + 6}px`);
    };
    place();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [open]);
}
