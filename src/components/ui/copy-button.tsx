"use client";

import { useState } from "react";

export function CopyButton({ value, label, copiedLabel = "Copié !", className = "btn btn-secondary" }: { value: string; label: string; copiedLabel?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("error");
    }
    window.setTimeout(() => setState("idle"), 2500);
  }

  return (
    <button aria-live="polite" className={className} onClick={copy} type="button">
      {state === "copied" ? copiedLabel : state === "error" ? "Copie impossible" : label}
    </button>
  );
}
