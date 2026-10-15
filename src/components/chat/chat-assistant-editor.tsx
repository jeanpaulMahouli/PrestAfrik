"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { saveChatAssistant, type ChatSaveState } from "@/modules/chat/actions";
import { fillChatTemplate, type ChatConfigInput } from "@/modules/chat/config";

const formId = "chat-assistant-form";

export function ChatAssistantEditor({ initial, storeName, storeSlug }: { initial: ChatConfigInput; storeName: string; storeSlug: string }) {
  const [config, setConfig] = useState(initial);
  const [state, action, pending] = useActionState<ChatSaveState, FormData>(saveChatAssistant, null);
  const set = <K extends keyof ChatConfigInput>(key: K, value: ChatConfigInput[K]) => setConfig((current) => ({ ...current, [key]: value }));
  const updateReply = (index: number, patch: Partial<ChatConfigInput["quickReplies"][number]>) =>
    set("quickReplies", config.quickReplies.map((reply, position) => (position === index ? { ...reply, ...patch } : reply)));
  const moveReply = (from: number, to: number) => {
    if (to < 0 || to >= config.quickReplies.length) return;
    const next = [...config.quickReplies];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    set("quickReplies", next);
  };
  const welcome = fillChatTemplate(config.welcomeMessage, { boutique: storeName });

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Assistant WhatsApp de la boutique</h1>
          <p className="v-page-subtitle">Aidez vos visiteurs à vous joindre en un geste : ils posent une question et poursuivent avec vous sur WhatsApp.</p>
        </div>
        <div className="v-page-actions">
          <Link className="btn btn-secondary" href={`/boutique/${storeSlug}`} target="_blank">Voir sur ma boutique</Link>
          <button className="btn btn-primary" disabled={pending} form={formId} type="submit">{pending ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </div>

      {state?.ok === false && <p className="v-banner v-banner-danger" role="alert">{state.message}</p>}
      {state?.ok && <p className="v-banner v-banner-success" role="status">C’est enregistré ! Vos visiteurs voient les changements tout de suite.</p>}

      <div className="v-split">
        <form
          className="v-stack"
          id={formId}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData();
            data.append("config", JSON.stringify(config));
            startTransition(() => action(data));
          }}
        >
          <section className="v-card">
            <h2 className="v-card-title">Activation</h2>
            <label className="v-switch">
              <span>Afficher l’assistant WhatsApp sur ma boutique</span>
              <input checked={config.enabled} onChange={(event) => set("enabled", event.target.checked)} type="checkbox" />
            </label>
            <p className="v-small v-muted">
              Un bouton « Une question ? » apparaît sur votre boutique. Vos visiteurs choisissent une question, puis continuent la discussion avec vous sur
              WhatsApp. Aucune intelligence artificielle : les réponses sont celles que vous rédigez.
            </p>
          </section>

          <section className="v-card">
            <h2 className="v-card-title">Message d’accueil</h2>
            <label className="v-field">
              Premier message affiché (200 caractères maximum)
              <input maxLength={200} onChange={(event) => set("welcomeMessage", event.target.value)} value={config.welcomeMessage} />
              <span className="v-field-help">Variable disponible : {"{boutique}"}.</span>
            </label>
          </section>

          <section className="v-card">
            <h2 className="v-card-title">Questions rapides (6 au maximum)</h2>
            <div className="v-stack quick-replies">
              {config.quickReplies.map((reply, index) => (
                <fieldset className="quick-reply" key={index}>
                  <div className="quick-reply-head">
                    <legend>Question rapide {index + 1}</legend>
                    <label className="v-switch quick-reply-switch">
                      <span>{reply.enabled ? "Activée" : "Désactivée"}</span>
                      <input checked={reply.enabled} onChange={(event) => updateReply(index, { enabled: event.target.checked })} type="checkbox" />
                    </label>
                    <span className="quick-reply-tools">
                      <button aria-label={`Monter la question ${index + 1}`} disabled={index === 0} onClick={() => moveReply(index, index - 1)} type="button">↑</button>
                      <button aria-label={`Descendre la question ${index + 1}`} disabled={index === config.quickReplies.length - 1} onClick={() => moveReply(index, index + 1)} type="button">↓</button>
                      <button className="v-link-button" onClick={() => set("quickReplies", config.quickReplies.filter((_, position) => position !== index))} type="button">Supprimer</button>
                    </span>
                  </div>
                  <label className="v-field">
                    Texte du bouton (30 caractères maximum)
                    <input maxLength={30} onChange={(event) => updateReply(index, { label: event.target.value })} value={reply.label} />
                  </label>
                  <label className="v-field">
                    Réponse affichée au client
                    <textarea maxLength={500} onChange={(event) => updateReply(index, { answer: event.target.value })} rows={2} value={reply.answer} />
                  </label>
                </fieldset>
              ))}
            </div>
            {config.quickReplies.length < 6 && (
              <button className="btn btn-secondary" onClick={() => set("quickReplies", [...config.quickReplies, { label: "", answer: "", enabled: true }])} type="button">
                + Ajouter une question rapide
              </button>
            )}
          </section>

          <section className="v-card">
            <h2 className="v-card-title">Transfert vers WhatsApp</h2>
            <label className="v-field">
              Message prérempli envoyé au vendeur
              <input maxLength={300} onChange={(event) => set("transferTemplate", event.target.value)} value={config.transferTemplate} />
              <span className="v-field-help">Variables : {"{boutique}"}, {"{question}"}, {"{produit}"} (nom du produit consulté), {"{page}"}.</span>
            </label>
            <p className="v-small v-muted">
              Le visiteur voit toujours le message avant l’envoi et appuie lui-même sur « Envoyer » dans WhatsApp. Le numéro utilisé est celui de votre boutique
              (page « Messages WhatsApp »).
            </p>
          </section>

          <section className="v-card">
            <h2 className="v-card-title">Où l’afficher ?</h2>
            {(
              [
                ["showOnHome", "Page d’accueil de la boutique"],
                ["showOnProduct", "Fiches produit"],
                ["showOnCart", "Panier"],
                ["showOnCheckout", "Formulaire de commande"],
              ] as const
            ).map(([key, label]) => (
              <label className="v-check" key={key}>
                <input checked={config[key]} onChange={(event) => set(key, event.target.checked)} type="checkbox" />
                {label}
              </label>
            ))}
            <label className="v-field off-hours-field">
              Message hors des heures d’ouverture (facultatif)
              <textarea maxLength={300} onChange={(event) => set("offHoursMessage", event.target.value)} rows={2} value={config.offHoursMessage} />
              <span className="v-field-help">Affiché en dehors de vos horaires, s’ils sont renseignés dans votre boutique.</span>
            </label>
          </section>
        </form>

        <div className="v-stack chat-preview-column">
          <section aria-labelledby="chat-preview-title" className="v-card">
            <h2 className="v-card-title" id="chat-preview-title">Aperçu en direct</h2>
            <div className="chat-preview">
              <p className="chat-preview-header">{storeName} · Assistant</p>
              <p className="chat-preview-bubble">{welcome}</p>
              <div className="chat-preview-chips">
                {config.quickReplies.filter((reply) => reply.enabled && reply.label).map((reply, index) => (
                  <span key={index}>{reply.label}</span>
                ))}
              </div>
            </div>
            <p className="v-small v-muted">L’aperçu se met à jour pendant que vous écrivez.</p>
          </section>
          <section className="v-card">
            <h2 className="v-card-title">Bon à savoir</h2>
            <ul className="tips-list">
              <li>Aucun message n’est envoyé sans l’accord du visiteur.</li>
              <li>Les conversations se poursuivent sur votre WhatsApp, pas dans PrestAfrik.</li>
              <li>Cette fonction est incluse dans toutes les offres.</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
