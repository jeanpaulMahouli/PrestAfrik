"use client";

import Script from "next/script";
import { useEffect } from "react";
import { attributionCookie, isSellerFunnelHref, readAttribution, withAttribution, type Attribution } from "@/lib/attribution";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Envoie un événement à Google Analytics 4 (sans effet tant que GA n'est pas installé). */
export function trackEvent(name: string, params: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") window.gtag("event", name, params);
  else window.dataLayer?.push({ event: name, ...params });
}

function cookieDomain() {
  const host = window.location.hostname;
  return host === "prestafrik.com" || host.endsWith(".prestafrik.com") ? "; domain=.prestafrik.com" : "";
}

function savedAttribution(): Attribution {
  const raw = document.cookie.split("; ").find((part) => part.startsWith(`${attributionCookie}=`));
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw.slice(attributionCookie.length + 1))) as Attribution;
  } catch {
    return {};
  }
}

/**
 * Sur chaque page : garde les paramètres publicitaires de l'adresse (30 jours, cookie commun aux
 * sous-domaines), puis, à chaque clic vers « /boutique » ou « /inscription », les ajoute au lien et envoie
 * l'événement « devenir_vendeur_clic » avec l'emplacement du bouton (attribut data-emplacement).
 */
export function AttributionTracker() {
  useEffect(() => {
    const fresh = readAttribution(window.location.search);
    if (Object.keys(fresh).length) {
      document.cookie = `${attributionCookie}=${encodeURIComponent(JSON.stringify(fresh))}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax${cookieDomain()}`;
    }

    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || !isSellerFunnelHref(link.href, window.location.href)) return;
      const placement = link.closest("[data-emplacement]")?.getAttribute("data-emplacement") ?? "autre";
      if (new URL(link.href).pathname.startsWith("/boutique")) trackEvent("devenir_vendeur_clic", { emplacement: placement });
      const attribution = { ...savedAttribution(), ...readAttribution(window.location.search) };
      const target = withAttribution(link.href, attribution);
      if (target === link.href) return;
      // Lien ordinaire ou lien Next.js : la page suivante reçoit les paramètres de la campagne.
      link.href = target;
      if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && link.target !== "_blank") {
        event.preventDefault();
        window.location.assign(target);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}

/** Événement de conversion envoyé une seule fois par boutique (l'écran peut être rechargé). */
export function ConversionEvent({ name, id }: { name: string; id: string }) {
  useEffect(() => {
    const key = `prestafrik:conversion:${name}:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Stockage indisponible (navigation privée) : l'événement est quand même envoyé.
    }
    trackEvent(name, { ...savedAttribution() });
  }, [name, id]);
  return null;
}

/** Google Analytics 4, chargé après l'affichage de la page, seulement si NEXT_PUBLIC_GA_ID est défini. */
export function GoogleAnalytics({ id }: { id: string }) {
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(id)});`}
      </Script>
    </>
  );
}
