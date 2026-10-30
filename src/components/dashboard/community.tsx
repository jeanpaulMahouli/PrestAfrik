"use client";

import { ChevronLeft, Lightbulb, MessageCircleQuestion, MessagesSquare, SendHorizontal, Star, X } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { sendVendorFeedback, type FeedbackState } from "@/modules/support/feedback";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

type Kind = "REVIEW" | "SUGGESTION" | "QUESTION";

const choices: { kind: Kind; icon: typeof Star; label: string; prompt: string }[] = [
  { kind: "REVIEW", icon: Star, label: "Noter PrestAfrik", prompt: "Quelle note donnez-vous à PrestAfrik ? Vous pouvez ajouter un mot si vous le souhaitez." },
  { kind: "SUGGESTION", icon: Lightbulb, label: "Proposer une idée", prompt: "Super ! Quelle amélioration ou nouvelle fonctionnalité aimeriez-vous ?" },
  { kind: "QUESTION", icon: MessageCircleQuestion, label: "Poser une question", prompt: "Posez votre question : l’équipe vous répond par e-mail." },
];

/** Événement qui ouvre la fenêtre de discussion (carte « Partagez vos suggestions » → bouton flottant). */
const openEvent = "prestafrik:avis";
const openFeedbackChat = () => window.dispatchEvent(new Event(openEvent));

/**
 * Bloc « Communauté » du tableau de bord : trois carrés cliquables (chaîne WhatsApp, YouTube, avis et
 * suggestions). Le troisième ouvre la fenêtre de discussion du bouton flottant (FeedbackLauncher).
 */
export function CommunityBlock({ whatsappChannel, youtube }: { whatsappChannel: string; youtube: string }) {
  return (
    <section aria-labelledby="community-title" className="community">
      <h2 className="v-card-title" id="community-title">
        Communauté PrestAfrik
      </h2>
      <ul className="hub-cards glass-zone">
        <li>
          <a className="hub-card community-card-whatsapp" href={whatsappChannel} rel="noopener noreferrer" target="_blank">
            <span aria-hidden="true" className="hub-card-icon">
              <WhatsAppIcon size={30} variant="logo" />
            </span>
            <span className="hub-card-text">
              <strong>Rejoignez-nous sur WhatsApp</strong>
              <small>Notre chaîne WhatsApp : les actualités et astuces de PrestAfrik, en premier.</small>
            </span>
          </a>
        </li>
        <li>
          <a className="hub-card community-card-youtube" href={youtube} rel="noopener noreferrer" target="_blank">
            <span aria-hidden="true" className="hub-card-icon">
              <svg fill="currentColor" height="30" viewBox="0 0 24 24" width="30">
                <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.7 15.1V8.9l5.8 3.1-5.8 3.1Z" />
              </svg>
            </span>
            <span className="hub-card-text">
              <strong>Rejoignez-nous sur YouTube</strong>
              <small>Tutoriels en vidéo pour vendre plus avec votre boutique.</small>
            </span>
          </a>
        </li>
        <li>
          <button className="hub-card" onClick={openFeedbackChat} type="button">
            <span aria-hidden="true" className="hub-card-icon">
              <MessagesSquare size={30} strokeWidth={1.8} />
            </span>
            <span className="hub-card-text">
              <strong>Partagez vos suggestions</strong>
              <small>Notez PrestAfrik, donnez votre avis ou posez vos questions à l’équipe.</small>
            </span>
          </button>
        </li>
      </ul>
    </section>
  );
}

/**
 * Bouton de discussion flottant (en bas à droite de l'espace vendeur) et sa fenêtre : noter PrestAfrik,
 * proposer une idée ou poser une question. Le message arrive dans Administration → Messages et avis.
 */
export function FeedbackLauncher({ firstName }: { firstName: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(openEvent, show);
    return () => window.removeEventListener(openEvent, show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && (
        <section aria-labelledby="feedback-chat-title" className="feedback-panel" role="dialog">
          <header className="feedback-panel-head">
            <span aria-hidden="true" className="feedback-panel-avatar">
              <MessagesSquare size={20} />
            </span>
            <div>
              <h2 id="feedback-chat-title">Parlons-en !</h2>
              <p>L’équipe PrestAfrik vous lit</p>
            </div>
            <button aria-label="Fermer la discussion" className="feedback-panel-close" onClick={() => setOpen(false)} type="button">
              <X aria-hidden="true" size={18} />
            </button>
          </header>
          <FeedbackChat firstName={firstName} onDone={() => setOpen(false)} />
        </section>
      )}
      <button
        aria-expanded={open}
        aria-label={open ? "Fermer la discussion avec PrestAfrik" : "Discuter avec PrestAfrik : avis, idée ou question"}
        className="feedback-launcher"
        onClick={() => setOpen((value) => !value)}
        ref={buttonRef}
        type="button"
      >
        {open ? <X aria-hidden="true" size={24} /> : <MessagesSquare aria-hidden="true" size={24} />}
      </button>
    </>
  );
}

/** Discussion : choix du sujet, note ou message, envoi, confirmation. */
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
    <div aria-live="polite" className="chat">
      <div className="chat-log">
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
            {state?.ok && <p className="chat-bubble chat-bubble-bot chat-bubble-success">{state.message}</p>}
          </>
        )}
        <div ref={endRef} />
      </div>

      {kind && state?.ok && (
        <div className="chat-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setKind(null);
              setRating(0);
            }}
            type="button"
          >
            Envoyer un autre message
          </button>
          <button className="btn btn-primary btn-sm" onClick={onDone} type="button">
            Fermer
          </button>
        </div>
      )}

      {kind && !state?.ok && (
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
                  <Star aria-hidden="true" className={value <= rating ? "is-on" : ""} fill={value <= rating ? "currentColor" : "none"} size={28} />
                  <span className="visually-hidden">
                    {value} étoile{value > 1 ? "s" : ""}
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {state && !state.ok && (
            <p className="v-field-error" role="alert">
              {state.message}
            </p>
          )}
          <div className="chat-composer">
            <button aria-label="Changer de sujet" className="chat-back" onClick={() => setKind(null)} type="button">
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <label className="visually-hidden" htmlFor="chat-message">
              Votre message
            </label>
            <textarea
              autoFocus={kind !== "REVIEW"}
              id="chat-message"
              maxLength={2000}
              name="message"
              onKeyDown={(event) => {
                // Entrée envoie, Maj + Entrée passe à la ligne (comme dans une messagerie).
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={kind === "REVIEW" ? "Un mot sur votre expérience (facultatif)" : "Écrivez votre message…"}
              rows={1}
            />
            <button aria-label={pending ? "Envoi en cours" : "Envoyer"} className="chat-send" disabled={pending || (kind === "REVIEW" && !rating)} type="submit">
              <SendHorizontal aria-hidden="true" size={20} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
