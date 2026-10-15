"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { texts } from "@/config/texts";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
};

/**
 * Boîte de dialogue accessible (pattern APG « dialog ») : centrée dès 768 px, feuille basse en dessous,
 * focus piégé puis restitué, fermeture par Échap et par le fond.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = "md" }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const selector = "a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])";
    const focusables = () => [...(panel?.querySelectorAll<HTMLElement>(selector) ?? [])];
    (focusables().find((element) => element.dataset.autofocus !== undefined) ?? focusables()[0] ?? panel)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="dialog-layer">
      <div aria-hidden="true" className="dialog-backdrop" onClick={onClose} />
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`dialog-panel dialog-${size}`}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="dialog-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button aria-label={texts.common.close} className="dialog-close" onClick={onClose} type="button">
            <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
