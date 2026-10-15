"use client";

import { useEffect, useRef } from "react";

/** Ouvre WhatsApp une seule fois après « Commander sur WhatsApp » ; le bouton reste en secours. */
export function WhatsappAutoOpen({ href }: { href: string }) {
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const key = `wa-opened:${window.location.pathname}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Stockage indisponible : on ouvre quand même une fois.
    }
    window.location.assign(href);
  }, [href]);

  return (
    <a className="sf-btn sf-btn-whatsapp sf-btn-block" href={href} rel="noopener noreferrer">
      Envoyer ma commande sur WhatsApp
    </a>
  );
}
