"use client";

import { useActionState, useEffect, useRef } from "react";
import { SendHorizontal } from "@/components/ui/icons";
import { vendorReplyToTicket, type VendorReplyState } from "@/modules/support/vendor-actions";

/** Réponse du vendeur dans une conversation avec l'équipe (sans rechargement). */
export function VendorReplyForm({ ticketId }: { ticketId: string }) {
  const [state, dispatch, pending] = useActionState<VendorReplyState, FormData>(vendorReplyToTicket, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form action={dispatch} className="conv-reply" ref={formRef}>
      <input name="ticketId" type="hidden" value={ticketId} />
      <label className="visually-hidden" htmlFor="conv-reply-body">
        Votre message
      </label>
      <textarea id="conv-reply-body" maxLength={2000} minLength={2} name="body" placeholder="Écrire à l’équipe…" required rows={2} />
      <button aria-label="Envoyer" className="btn btn-primary conv-send" disabled={pending} type="submit">
        <SendHorizontal aria-hidden="true" size={18} />
      </button>
      {state && (
        <p className={state.ok ? "v-small v-muted" : "v-field-error"} role={state.ok ? "status" : "alert"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
