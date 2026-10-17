"use client";

import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { deleteStore, type DeleteStoreState } from "@/modules/stores/settings-actions";

/** « Zone sensible » de Ma boutique : suppression définitive, confirmée en retapant le nom de la boutique. */
export function DeleteStoreZone({ storeName, orderCount, productCount }: { storeName: string; orderCount: number; productCount: number }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, action, pending] = useActionState<DeleteStoreState, FormData>(deleteStore, null);

  return (
    <section aria-labelledby="supprimer-titre" className="store-danger" id="supprimer">
      <h3 className="store-danger-title" id="supprimer-titre">Zone sensible</h3>
      <p className="v-small v-muted">
        Supprimer la boutique efface définitivement ses produits, ses commandes, ses clients et ses réglages. Son adresse web pourra être reprise par quelqu’un
        d’autre. Cette action est irréversible.
      </p>
      <div className="v-button-row">
        <button className="btn btn-danger-outline" onClick={() => setOpen(true)} type="button">
          Supprimer ma boutique…
        </button>
      </div>
      <Dialog onClose={() => setOpen(false)} open={open} size="sm" title={`Supprimer « ${storeName} » ?`}>
        <form action={action}>
          <p className="v-small">
            Vous allez supprimer <strong>définitivement</strong> la boutique « {storeName} »
            {productCount || orderCount ? (
              <>
                {" "}
                avec ses <strong>{productCount} produit{productCount > 1 ? "s" : ""}</strong> et ses <strong>{orderCount} commande{orderCount > 1 ? "s" : ""}</strong>
              </>
            ) : null}
            . Vos clients ne pourront plus y accéder et rien ne pourra être récupéré.
          </p>
          <label className="v-field">
            Pour confirmer, tapez le nom de la boutique : <strong>{storeName}</strong>
            <input autoComplete="off" name="confirmName" onChange={(event) => setTyped(event.target.value)} value={typed} />
          </label>
          {state && !state.ok && (
            <p className="v-field-error" role="alert">
              {state.message}
            </p>
          )}
          <div className="action-dialog-buttons">
            <button className="btn btn-secondary" onClick={() => setOpen(false)} type="button">
              Annuler
            </button>
            <button className="btn btn-danger" disabled={pending || typed.trim() !== storeName} type="submit">
              {pending ? "Suppression…" : "Supprimer définitivement"}
            </button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
