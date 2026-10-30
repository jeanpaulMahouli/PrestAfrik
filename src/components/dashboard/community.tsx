"use client";

import { Lightbulb, MessageCircleQuestion, MessagesSquare, Star } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { sendVendorFeedback, type FeedbackState } from "@/modules/support/feedback";

type Kind = "REVIEW" | "SUGGESTION" | "QUESTION";

const choices: { kind: Kind; icon: typeof Star; label: string; prompt: string }[] = [
  { kind: "REVIEW", icon: Star, label: "Noter PrestAfrik", prompt: "Quelle note donnez-vous à PrestAfrik ? Vous pouvez ajouter un mot si vous le souhaitez." },
  { kind: "SUGGESTION", icon: Lightbulb, label: "Proposer une idée", prompt: "Super ! Quelle amélioration ou nouvelle fonctionnalité aimeriez-vous ?" },
  { kind: "QUESTION", icon: MessageCircleQuestion, label: "Poser une question", prompt: "Posez votre question : l’équipe vous répond par e-mail." },
];

/**
 * Bloc « Communauté » du tableau de bord : trois cartes cliquables (chaîne WhatsApp, YouTube, avis et
 * suggestions). La troisième ouvre un petit assistant de discussion pour noter PrestAfrik, proposer une
 * idée ou poser une question ; le message arrive dans Administration → Messages et avis.
 */
export function CommunityBlock({ firstName, whatsappChannel, youtube }: { firstName: string; whatsappChannel: string; youtube: string }) {
  const [open, setOpen] = useState(false);

  return (
    <section aria-labelledby="community-title" className="community">
      <h2 className="v-card-title" id="community-title">
        Communauté PrestAfrik
      </h2>
      <ul className="community-cards">
        <li>
          <a className="community-card community-card-whatsapp" href={whatsappChannel} rel="noopener noreferrer" target="_blank">
            <span aria-hidden="true" className="community-icon">
              <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24">
                <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 .9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z" />
              </svg>
            </span>
            <span className="community-text">
              <strong>Rejoignez-nous sur WhatsApp</strong>
              <small>Notre chaîne WhatsApp : les actualités et astuces de PrestAfrik, en premier.</small>
            </span>
          </a>
        </li>
        <li>
          <a className="community-card community-card-youtube" href={youtube} rel="noopener noreferrer" target="_blank">
            <span aria-hidden="true" className="community-icon">
              <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24">
                <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.7 15.1V8.9l5.8 3.1-5.8 3.1Z" />
              </svg>
            </span>
            <span className="community-text">
              <strong>Rejoignez-nous sur YouTube</strong>
              <small>Tutoriels en vidéo pour vendre plus avec votre boutique.</small>
            </span>
          </a>
        </li>
        <li>
          <button className="community-card community-card-feedback" onClick={() => setOpen(true)} type="button">
            <span aria-hidden="true" className="community-icon">
              <MessagesSquare size={24} />
            </span>
            <span className="community-text">
              <strong>Partagez vos suggestions</strong>
              <small>Notez PrestAfrik, donnez votre avis ou posez vos questions à l’équipe.</small>
            </span>
          </button>
        </li>
      </ul>
      <Dialog description="Votre message arrive directement à l’équipe PrestAfrik." onClose={() => setOpen(false)} open={open} title="Parlons-en !">
        {open && <FeedbackChat firstName={firstName} onDone={() => setOpen(false)} />}
      </Dialog>
    </section>
  );
}

/** Assistant façon discussion : choix du sujet, note ou message, envoi, confirmation. */
function FeedbackChat({ firstName, onDone }: { firstName: string; onDone: () => void }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [rating, setRating] = useState(0);
  const [state, dispatch, pending] = useActionState<FeedbackState, FormData>(sendVendorFeedback, null);
  const endRef = useRef<HTMLDivElement>(null);
  const choice = choices.find((item) => item.kind === kind);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [kind, state]);

  return (
    <div className="chat" aria-live="polite">
      <p className="chat-bubble chat-bubble-bot">Bonjour {firstName} ! Que souhaitez-vous faire ?</p>
      {!kind ? (
        <div className="chat-choices">
          {choices.map(({ kind: value, icon: Icon, label }) => (
            <button className="chat-choice" key={value} onClick={() => setKind(value)} type="button">
              <Icon aria-hidden="true" size={18} /> {label}
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="chat-bubble chat-bubble-me">{choice?.label}</p>
          <p className="chat-bubble chat-bubble-bot">{choice?.prompt}</p>
          {state?.ok ? (
            <>
              <p className="chat-bubble chat-bubble-bot chat-bubble-success">{state.message}</p>
              <div className="chat-actions">
                <button className="btn btn-secondary" onClick={() => { setKind(null); setRating(0); }} type="button">
                  Envoyer un autre message
                </button>
                <button className="btn btn-primary" onClick={onDone} type="button">
                  Fermer
                </button>
              </div>
            </>
          ) : (
            <form
              className="chat-form"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                startTransition(() => dispatch(data));
              }}
            >
              <input name="kind" type="hidden" value={kind} />
              {kind === "REVIEW" && (
                <fieldset className="chat-stars">
                  <legend className="visually-hidden">Votre note</legend>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label key={value}>
                      <input checked={rating === value} className="visually-hidden" name="rating" onChange={() => setRating(value)} type="radio" value={value} />
                      <Star aria-hidden="true" className={value <= rating ? "is-on" : ""} fill={value <= rating ? "currentColor" : "none"} size={32} />
                      <span className="visually-hidden">{value} étoile{value > 1 ? "s" : ""}</span>
                    </label>
                  ))}
                </fieldset>
              )}
              <label className="visually-hidden" htmlFor="chat-message">
                Votre message
              </label>
              <textarea
                autoFocus={kind !== "REVIEW"}
                id="chat-message"
                maxLength={2000}
                name="message"
                placeholder={kind === "REVIEW" ? "Un mot sur votre expérience (facultatif)" : "Écrivez votre message…"}
                rows={4}
              />
              {state && !state.ok && (
                <p className="v-field-error" role="alert">
                  {state.message}
                </p>
              )}
              <div className="chat-actions">
                <button className="btn btn-secondary" onClick={() => setKind(null)} type="button">
                  Retour
                </button>
                <button className="btn btn-primary" disabled={pending || (kind === "REVIEW" && !rating)} type="submit">
                  {pending ? "Envoi…" : "Envoyer"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
      <div ref={endRef} />
    </div>
  );
}
