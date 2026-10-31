"use client";

import "@/styles/phone-mockup.css";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Cadre d'iPhone (public/landing/screens/cadre-iphone.webp, 1068 × 2217 px) affiché à 430 px de large :
// l'écran fait environ 400 × 865 px, barre d'état comprise (52 px), soit 400 × 813 px pour la page.
export const PHONE_WIDTH = 430;
export const PHONE_HEIGHT = Math.round((PHONE_WIDTH * 2217) / 1068);

export type PhoneStatusBar = { background: string; dark: boolean };

/**
 * Téléphone du « Aperçu avant publication » : cadre d'iPhone, barre d'état à l'heure réelle, écran.
 * Réduit (transform) pour tenir dans la largeur disponible. Utilisé par l'aperçu de « Ma boutique »
 * (une iframe) et par le guide vendeur (des animations de la vraie interface).
 */
export function PhoneMockup({ statusBar, children, maxWidth = PHONE_WIDTH }: { statusBar: PhoneStatusBar | null; children: ReactNode; maxWidth?: number }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(Math.min(1, maxWidth / PHONE_WIDTH) * 0.75);
  const [time, setTime] = useState("9:41");

  // Le téléphone est réduit pour tenir dans la colonne.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, maxWidth / PHONE_WIDTH, entry.contentRect.width / PHONE_WIDTH)));
    observer.observe(box);
    return () => observer.disconnect();
  }, [maxWidth]);

  // Heure réelle dans la barre d'état (après le montage, pour éviter un écart avec le rendu serveur).
  useEffect(() => {
    const tick = () => setTime(new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

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
          {children}
        </div>
        {/* Cadre de l'iPhone (bords, boutons, Dynamic Island), posé au-dessus de l'écran. */}
        <img alt="" aria-hidden="true" className="live-preview-frame" src="/landing/screens/cadre-iphone.webp" />
      </div>
    </div>
  );
}
