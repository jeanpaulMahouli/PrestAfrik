"use client";

import { Copy, CopyCheck } from "lucide-react";
import { useState } from "react";
import { copyText } from "@/lib/clipboard";

type CopyButtonProps = {
  value: string;
  label: string;
  copiedLabel?: string;
  className?: string;
  /** Bouton-icône : le libellé devient le nom accessible et l'info-bulle. */
  iconOnly?: boolean;
};

export function CopyButton({ value, label, copiedLabel = "Copié !", className = "btn btn-secondary", iconOnly = false }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    setState((await copyText(value)) ? "copied" : "error");
    window.setTimeout(() => setState("idle"), 2500);
  }

  const text = state === "copied" ? copiedLabel : state === "error" ? "Sélectionnez le texte pour le copier" : label;
  if (iconOnly) {
    return (
      <button aria-label={text} aria-live="polite" className={className} onClick={copy} title={text} type="button">
        {state === "copied" ? <CopyCheck aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
      </button>
    );
  }
  return (
    <button aria-live="polite" className={className} onClick={copy} type="button">
      {text}
    </button>
  );
}
