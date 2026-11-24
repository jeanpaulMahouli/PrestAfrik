"use client";

import { useRef } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { quickReplies } from "@/config/quick-replies";
import { replyToTicket } from "@/modules/support/actions";

/**
 * Réponse de l'équipe dans la boîte de réception : réponses rapides (insérées puis modifiables),
 * « Envoyer » (en attente du vendeur) ou « Envoyer et clore » (traitée).
 */
export function InboxReply({ ticketId, firstName, view, email }: { ticketId: string; firstName: string; view: string; email: string }) {
  const area = useRef<HTMLTextAreaElement>(null);

  return (
    <form action={replyToTicket} className="inbox-reply">
      <input name="ticketId" type="hidden" value={ticketId} />
      <input name="retour" type="hidden" value="avis" />
      <input name="vue" type="hidden" value={view} />
      <div className="inbox-quick">
        {quickReplies.map((reply) => (
          <button
            className="inbox-chip"
            key={reply.label}
            onClick={() => {
              if (!area.current) return;
              area.current.value = reply.body.replaceAll("{prenom}", firstName);
              area.current.focus();
            }}
            type="button"
          >
            {reply.label}
          </button>
        ))}
      </div>
      <label className="visually-hidden" htmlFor={`reply-${ticketId}`}>
        Votre réponse
      </label>
      <textarea id={`reply-${ticketId}`} maxLength={4000} minLength={5} name="body" placeholder={`Répondre à ${firstName}…`} ref={area} required rows={4} />
      <div className="inbox-reply-actions">
        <small className="v-muted">Envoyée dans l’app du vendeur et par e-mail ({email}).</small>
        <SubmitButton className="btn btn-secondary" name="close" pendingLabel="Envoi…" value="1">
          Envoyer et clore
        </SubmitButton>
        <SubmitButton className="btn btn-primary" pendingLabel="Envoi…">
          Envoyer
        </SubmitButton>
      </div>
    </form>
  );
}
