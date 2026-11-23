"use client";

import Link from "next/link";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { discardDraft } from "@/modules/stores/wizard-actions";

/**
 * « Abandonner » dans l'en-tête de l'assistant : la création est d'abord suspendue (rien n'est perdu,
 * reprise possible depuis le tableau de bord) ; la suppression du brouillon est un second choix, explicite.
 */
export function WizardPauseDialog({ draftId, storeName, exitHref }: { draftId: string; storeName: string; exitHref: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="wizard-discard" onClick={() => setOpen(true)} type="button">
        Abandonner
      </button>
      <Dialog
        onClose={() => setOpen(false)}
        open={open}
        size="sm"
        title={storeName ? `Suspendre la création de « ${storeName} » ?` : "Suspendre la création de votre boutique ?"}
      >
        <p className="v-small">
          Votre saisie est gardée : reprenez quand vous voulez.
        </p>
        <div className="action-dialog-buttons wizard-pause-buttons">
          <form action={discardDraft}>
            <input name="draftId" type="hidden" value={draftId} />
            <SubmitButton className="btn btn-danger-outline" pendingLabel="Suppression…">
              Abandonner définitivement
            </SubmitButton>
          </form>
          <button className="btn btn-secondary" onClick={() => setOpen(false)} type="button">
            Continuer la création
          </button>
          <Link className="btn btn-primary" data-autofocus="" href={exitHref}>
            Mettre en pause
          </Link>
        </div>
      </Dialog>
    </>
  );
}
