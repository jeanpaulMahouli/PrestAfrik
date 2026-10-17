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
        description="Rien n’est encore publié : votre boutique n’existe pas tant que vous n’avez pas terminé la dernière étape."
        onClose={() => setOpen(false)}
        open={open}
        size="sm"
        title={storeName ? `Suspendre la création de « ${storeName} » ?` : "Suspendre la création de votre boutique ?"}
      >
        <p className="v-small">
          La création de votre boutique sera <strong>suspendue</strong>. Tout ce que vous avez saisi est gardé : vous pourrez la reprendre plus tard, là où vous
          vous êtes arrêté, depuis votre tableau de bord (« Reprendre la création ») ou en revenant sur « Créer ma boutique ».
        </p>
        <p className="v-small v-muted">Vous ne souhaitez plus créer cette boutique ? Vous pouvez aussi l’abandonner définitivement : les informations saisies seront supprimées.</p>
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
