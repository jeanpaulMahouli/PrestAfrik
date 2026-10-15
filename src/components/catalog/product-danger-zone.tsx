"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";

type Action = (formData: FormData) => void | Promise<void>;

/** Carte « Zone sensible » du formulaire produit : archivage ou suppression selon l'historique. */
export function ProductDangerZone({
  productId,
  name,
  orderCount,
  archived,
  archive,
  remove,
}: {
  productId: string;
  name: string;
  orderCount: number;
  archived: boolean;
  archive: Action;
  remove: Action;
}) {
  const [open, setOpen] = useState(false);
  const ids = <input name="productIds" type="hidden" value={productId} />;

  return (
    <section className="v-card danger-zone">
      <h2 className="v-card-title">Zone sensible</h2>
      <p className="v-small v-muted">
        {orderCount > 0
          ? `Ce produit a déjà été commandé ${orderCount} fois. Pour garder l’historique de vos commandes intact, vous pouvez l’archiver : il disparaît de votre boutique mais reste dans vos commandes.`
          : "Ce produit n’a jamais été commandé : vous pouvez l’archiver ou le supprimer définitivement."}
      </p>
      <div className="v-button-row">
        {!archived && (
          <form action={archive}>
            {ids}
            <SubmitButton className="btn btn-secondary" pendingLabel="Archivage…">
              Archiver ce produit
            </SubmitButton>
          </form>
        )}
        <button className="btn btn-danger-outline" onClick={() => setOpen(true)} type="button">
          Supprimer…
        </button>
      </div>
      <Dialog
        onClose={() => setOpen(false)}
        open={open}
        size="sm"
        title={orderCount > 0 ? `Supprimer « ${name} » ?` : `Supprimer définitivement « ${name} » ?`}
      >
        <p className="v-small">
          {orderCount > 0 ? (
            <>
              Ce produit a déjà été commandé <strong>{orderCount} fois</strong> : il ne peut pas être supprimé définitivement. Archivez-le : il disparaît de votre
              boutique mais reste visible dans vos anciennes commandes.
            </>
          ) : (
            <>
              Ce produit n’a jamais été commandé. Sa suppression est <strong>définitive</strong> : ses informations et ses photos seront effacées.
            </>
          )}
        </p>
        <div className="action-dialog-buttons">
          <button className="btn btn-secondary" onClick={() => setOpen(false)} type="button">
            Annuler
          </button>
          <form action={orderCount > 0 ? archive : remove}>
            {ids}
            <SubmitButton className={orderCount > 0 ? "btn btn-primary" : "btn btn-danger"} pendingLabel="Patientez…">
              {orderCount > 0 ? "Archiver ce produit" : "Oui, supprimer"}
            </SubmitButton>
          </form>
        </div>
      </Dialog>
    </section>
  );
}
