"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type PreviewValues = { name: string; theme: string; promoStyle: string; primaryColor: string; secondaryColor: string; accentColor: string; logoUrl: string | null; description?: string; city?: string };

const promoClass = (style: string) => `sf-promo-${style.toLowerCase().replaceAll("_", "-")}`;

/**
 * Toutes les boutiques ont la même apparence : seuls le nom, le logo, la description, la ville et le style
 * des promotions changent en direct.
 *
 * Vitrine affichée dans l'aperçu de « Ma boutique » (iframe, ?apercu=1) : applique en direct les réglages
 * non enregistrés envoyés par le tableau de bord (même origine uniquement). Aucun effet hors de l'aperçu.
 */
export function StorefrontPreviewBridge({ initials }: { initials: string }) {
  const pathname = usePathname();
  const last = useRef<PreviewValues | null>(null);

  useEffect(() => {
    const embedded = window.parent !== window && new URLSearchParams(window.location.search).has("apercu");
    const root = document.querySelector<HTMLElement>(".sf");
    if (!embedded || !root) return;
    root.classList.add("sf-embedded");

    const apply = (values: PreviewValues) => {
      last.current = values;
      if (values.promoStyle) root.className = root.className.replace(/sf-promo-[a-z-]+/, promoClass(values.promoStyle));
      if (values.description !== undefined) {
        root.querySelectorAll<HTMLElement>("[data-store-description]").forEach((element) => {
          element.textContent = values.description ?? "";
          element.hidden = !values.description?.trim();
        });
      }
      if (values.city !== undefined) {
        root.querySelectorAll<HTMLElement>(".sf-brand-text small").forEach((element) => (element.textContent = values.city ?? ""));
      }
      const name = values.name.trim() || "Ma boutique";
      root.querySelectorAll<HTMLElement>("[data-store-name]").forEach((element) => (element.textContent = name));
      root.querySelectorAll<HTMLElement>("[data-store-logo]").forEach((element) => {
        element.replaceChildren();
        if (values.logoUrl) {
          const image = document.createElement("img");
          image.alt = "";
          image.src = values.logoUrl;
          element.append(image);
        } else {
          element.textContent =
            values.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("") || initials;
        }
      });
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; values?: PreviewValues } | null;
      if (data?.type === "prestafrik:apercu" && data.values) apply(data.values);
    };
    window.addEventListener("message", onMessage);
    // Après une navigation dans l'aperçu, les réglages en cours sont réappliqués à la nouvelle page.
    if (last.current) apply(last.current);
    return () => window.removeEventListener("message", onMessage);
  }, [pathname, initials]);

  return null;
}
