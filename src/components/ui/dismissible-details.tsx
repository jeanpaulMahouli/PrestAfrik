"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useDismiss } from "./use-dismiss";

/** <details> utilisé comme menu déroulant : il se ferme au clic en dehors et à la touche Échap. */
export function DismissibleDetails({ className, children }: { className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss<HTMLDetailsElement>(open, close);

  return (
    <details className={className} onToggle={(event) => setOpen(event.currentTarget.open)} open={open} ref={ref}>
      {children}
    </details>
  );
}
