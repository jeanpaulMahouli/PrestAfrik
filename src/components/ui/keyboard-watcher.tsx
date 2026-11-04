"use client";

import { useEffect } from "react";

/** Écart minimal entre la fenêtre et la zone visible pour considérer le clavier ouvert (px). */
const keyboardThreshold = 120;

const isEditable = (element: Element | null) =>
  element instanceof HTMLElement &&
  (element.isContentEditable ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    (element instanceof HTMLInputElement && !["button", "checkbox", "radio", "range", "submit", "reset", "file", "color", "image"].includes(element.type)));

/**
 * Téléphone : pendant la saisie (clavier ouvert), <html data-clavier="ouvert">. Les barres fixées en bas
 * (menu de l'espace vendeur, bulle d'aide) sont alors masquées : elles restent derrière le clavier au lieu de
 * remonter ou de flotter au milieu de l'écran pendant le défilement (Safari sur iPhone), et réapparaissent à
 * leur place dès que le clavier se ferme.
 */
export function KeyboardWatcher() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport || !window.matchMedia("(pointer: coarse)").matches) return;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const open = isEditable(document.activeElement) && window.innerHeight - viewport.height > keyboardThreshold;
        if (open) root.dataset.clavier = "ouvert";
        else delete root.dataset.clavier;
      });
    };
    viewport.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      delete root.dataset.clavier;
    };
  }, []);
  return null;
}
