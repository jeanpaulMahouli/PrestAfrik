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
 * Téléphone : pendant la saisie (clavier ouvert), <html data-clavier="ouvert"> et --clavier-hauteur (px).
 * Règles dans globals.css : les barres d'actions collées en bas (« Enregistrer »…) reprennent leur place dans
 * la page, les boutons flottants (menu du bas, bulles) sont masqués, et les fenêtres qui contiennent un champ
 * (discussions, fenêtres, listes de choix) remontent au-dessus du clavier. Tout revient dès qu'il se ferme.
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
        const covered = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
        const open = isEditable(document.activeElement) && window.innerHeight - viewport.height > keyboardThreshold;
        if (open) {
          root.dataset.clavier = "ouvert";
          root.style.setProperty("--clavier-hauteur", `${covered}px`);
        } else {
          delete root.dataset.clavier;
          root.style.removeProperty("--clavier-hauteur");
        }
      });
    };
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      delete root.dataset.clavier;
      root.style.removeProperty("--clavier-hauteur");
    };
  }, []);
  return null;
}
