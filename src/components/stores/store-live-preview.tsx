"use client";

import { useEffect, useRef, useState } from "react";
import { PhoneMockup, type PhoneStatusBar } from "@/components/shared/phone-mockup";

/** Réglages non enregistrés envoyés à la vitrine affichée dans l'aperçu. */
export type LivePreviewValues = {
  name: string;
  theme: string;
  promoStyle: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  /** Assistant de création : description et ville saisies, appliquées sans attendre l'enregistrement. */
  description?: string;
  city?: string;
};

type StatusBar = PhoneStatusBar;

/** Couleur de fond de l'en-tête de la boutique (ou de la page), et texte clair ou foncé lisible dessus. */
function readHeaderColor(frame: HTMLIFrameElement | null): StatusBar | null {
  try {
    const doc = frame?.contentDocument;
    const view = doc?.defaultView;
    if (!doc?.body || !view) return null;
    for (const element of [doc.querySelector(".sf-header"), doc.body, doc.documentElement]) {
      if (!element) continue;
      const match = view.getComputedStyle(element).backgroundColor.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
      if (!match || (match[4] !== undefined && Number(match[4]) < 0.5)) continue;
      const [r, g, b] = [match[1], match[2], match[3]].map(Number);
      return { background: `rgb(${r} ${g} ${b})`, dark: 0.299 * r + 0.587 * g + 0.114 * b < 150 };
    }
  } catch {
    // Page pas encore chargée : barre d'état blanche par défaut.
  }
  return null;
}

/**
 * Aperçu réaliste de « Ma boutique » : la vraie page de la boutique (produits, prix, livraison…) dans un
 * cadre d'iPhone. Les modifications non enregistrées (nom, thème, couleurs, logo) y sont appliquées
 * en direct ; après l'enregistrement, la page est rechargée. La barre d'état prend la couleur de
 * l'en-tête de la boutique, comme sur un vrai téléphone.
 */
export function StoreLivePreview({ storePath, values, reloadKey }: { storePath: string; values: LivePreviewValues; reloadKey: number }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [statusBar, setStatusBar] = useState<StatusBar | null>(null);

  // La page peut finir de charger avant que React n'écoute « onLoad » (rendu serveur, page déjà en cache) :
  // on vérifie donc son état au montage et à chaque rechargement (après un enregistrement).
  useEffect(() => {
    const frame = frameRef.current;
    let ready = false;
    try {
      ready = frame?.contentDocument?.readyState === "complete" && frame.contentWindow?.location.href !== "about:blank";
    } catch {
      ready = false;
    }
    setLoaded(ready);
  }, [reloadKey]);

  useEffect(() => {
    if (!loaded) return;
    frameRef.current?.contentWindow?.postMessage({ type: "prestafrik:apercu", values }, window.location.origin);
    // Couleur de l'en-tête relue une fois les nouvelles couleurs appliquées dans la page.
    const timer = window.setTimeout(() => setStatusBar(readHeaderColor(frameRef.current)), 150);
    return () => window.clearTimeout(timer);
  }, [values, loaded]);

  return (
    <PhoneMockup statusBar={statusBar}>
      {!loaded && <span aria-hidden="true" className="v-skeleton live-preview-loading" />}
      <iframe
        key={reloadKey}
        onLoad={() => {
          setLoaded(true);
          setStatusBar(readHeaderColor(frameRef.current));
        }}
        ref={frameRef}
        src={`${storePath}${storePath.includes("?") ? "&" : "?"}apercu=1`}
        title="Aperçu de votre boutique telle que vos clients la verront"
      />
    </PhoneMockup>
  );
}
