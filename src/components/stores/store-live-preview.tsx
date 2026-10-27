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
};

// Écran de 390 × 780 px (téléphone courant), plus le cadre (2 × 10 px) et la barre d'état (34 px) : voir dashboard-theme.css.
const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 780;
const PHONE_WIDTH = SCREEN_WIDTH + 20;
const PHONE_HEIGHT = SCREEN_HEIGHT + 20 + 34;

/**
 * Aperçu réaliste de « Ma boutique » : la vraie page de la boutique (produits, prix, livraison…) dans un
 * cadre de téléphone. Les modifications non enregistrées (nom, thème, couleurs, logo) y sont appliquées
 * en direct ; après l'enregistrement, la page est rechargée.
 */
export function StoreLivePreview({ storePath, values, reloadKey }: { storePath: string; values: LivePreviewValues; reloadKey: number }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.75);
  const [loaded, setLoaded] = useState(false);

  // Le téléphone est réduit pour tenir dans la colonne.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / PHONE_WIDTH)));
    observer.observe(box);
    return () => observer.disconnect();
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
  }, [values, loaded]);

  return (
    <div className="live-preview" ref={boxRef} style={{ height: PHONE_HEIGHT * scale + 24 }}>
      <div className="live-preview-phone" style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT, transform: `scale(${scale})` }}>
        <span aria-hidden="true" className="live-preview-notch" />
        {!loaded && <span aria-hidden="true" className="v-skeleton live-preview-loading" />}
        <iframe
          key={reloadKey}
          onLoad={() => setLoaded(true)}
          ref={frameRef}
          src={`${storePath}?apercu=1`}
          title="Aperçu de votre boutique telle que vos clients la verront"
        />
      </div>
    </div>
  );
}
