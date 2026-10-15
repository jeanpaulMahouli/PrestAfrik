"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";

export function CopyButton({ value, label, copiedLabel = "Copié !", className = "btn btn-secondary" }: { value: string; label: string; copiedLabel?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    setState((await copyText(value)) ? "copied" : "error");
    window.setTimeout(() => setState("idle"), 2500);
  }

  return (
    <button aria-live="polite" className={className} onClick={copy} type="button">
      {state === "copied" ? copiedLabel : state === "error" ? "Sélectionnez le lien pour le copier" : label}
    </button>
  );
}
