"use client";

import { useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";

type ActionDialogProps = {
  /** Server Action appelée à l'envoi du formulaire. */
  action: (formData: FormData) => void | Promise<void>;
  triggerLabel: string;
  triggerClassName?: string;
  title: string;
  description?: string;
  submitLabel: string;
  submitClassName?: string;
  pendingLabel?: string;
  hiddenFields?: Record<string, string>;
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
};

/** Bouton qui ouvre une boîte de dialogue contenant un formulaire (confirmation, motif, saisie). */
export function ActionDialog({
  action,
  triggerLabel,
  triggerClassName = "btn btn-secondary",
  title,
  description,
  submitLabel,
  submitClassName = "btn btn-primary",
  pendingLabel = "Enregistrement…",
  hiddenFields = {},
  children,
  size = "sm",
}: ActionDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={triggerClassName} onClick={() => setOpen(true)} type="button">
        {triggerLabel}
      </button>
      <Dialog description={description} onClose={() => setOpen(false)} open={open} size={size} title={title}>
        <form action={action} className="action-dialog-form">
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} name={name} type="hidden" value={value} />
          ))}
          {children}
          <div className="action-dialog-buttons">
            <button className="btn btn-secondary" onClick={() => setOpen(false)} type="button">
              Annuler
            </button>
            <SubmitButton className={submitClassName} pendingLabel={pendingLabel}>
              {submitLabel}
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
