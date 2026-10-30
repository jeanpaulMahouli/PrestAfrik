"use client";

import { useEffect, useRef, useState } from "react";

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

// Cadre d'iPhone (public/landing/screens/cadre-iphone.webp, 1068 × 2217 px) affiché à 430 px de large :
// l'écran fait environ 400 × 865 px, barre d'état comprise (marges de l'écran : dashboard-theme.css).
const PHONE_WIDTH = 430;
const PHONE_HEIGHT = Math.round((PHONE_WIDTH * 2217) / 1068);

type StatusBar = { background: string; dark: boolean };

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
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.75);
  const [loaded, setLoaded] = useState(false);
  const [statusBar, setStatusBar] = useState<StatusBar | null>(null);
  const [time, setTime] = useState("9:41");

  // Le téléphone est réduit pour tenir dans la colonne.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / PHONE_WIDTH)));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Heure réelle dans la barre d'état (après le montage, pour éviter un écart avec le rendu serveur).
  useEffect(() => {
    const tick = () => setTime(new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

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
    <div className="live-preview" ref={boxRef} style={{ height: PHONE_HEIGHT * scale + 24 }}>
      <div className="live-preview-phone" style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT, transform: `scale(${scale})` }}>
        <div className="live-preview-screen">
          <div aria-hidden="true" className={`live-preview-status${statusBar?.dark ? " is-dark" : ""}`} style={statusBar ? { background: statusBar.background } : undefined}>
            <span>{time}</span>
            <span className="live-preview-status-icons">
              <svg fill="currentColor" height="11" viewBox="0 0 18 11" width="18">
                <rect height="4" rx="1" width="3" y="7" />
                <rect height="6" rx="1" width="3" x="5" y="5" />
                <rect height="8.5" rx="1" width="3" x="10" y="2.5" />
                <rect height="11" rx="1" width="3" x="15" />
              </svg>
              <svg fill="none" height="11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 16 11" width="16">
                <path d="M1.5 4a9.5 9.5 0 0 1 13 0M4 6.8a5.7 5.7 0 0 1 8 0" />
                <circle cx="8" cy="9.4" fill="currentColor" r="1.3" stroke="none" />
              </svg>
              <svg height="12" viewBox="0 0 27 12" width="27">
                <rect fill="none" height="11" opacity="0.45" rx="3.5" stroke="currentColor" width="23" x="0.5" y="0.5" />
                <rect fill="currentColor" height="8" rx="2" width="17" x="2" y="2" />
                <path d="M25 4v4c.8-.3 1.5-1.1 1.5-2S25.8 4.3 25 4Z" fill="currentColor" opacity="0.5" />
              </svg>
            </span>
          </div>
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
        </div>
        {/* Cadre de l'iPhone (bords, boutons, Dynamic Island), posé au-dessus de l'écran. */}
        <img alt="" aria-hidden="true" className="live-preview-frame" src="/landing/screens/cadre-iphone.webp" />
      </div>
    </div>
  );
}
