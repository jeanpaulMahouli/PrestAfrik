"use client";

import { Check, CircleAlert, Lightbulb, Sparkles, TriangleAlert } from "@/components/ui/icons";
import { useState } from "react";
import { RichText } from "@/components/ui/rich-text";
import type { CompletionStep, ProductNotice } from "@/modules/catalog/product-notices";

// Assistant IA (nom et description) et « Infos pratiques » du formulaire produit.

export type AiSuggestion = { name: string; description: string };

export async function requestAiSuggestion(body: { photos: string[]; name: string }): Promise<AiSuggestion> {
  let response: Response;
  try {
    response = await fetch("/api/dashboard/produits/ia", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Connexion interrompue. Vérifiez votre connexion puis réessayez.");
  }
  const data = (await response.json().catch(() => null)) as (AiSuggestion & { error?: string }) | null;
  if (!response.ok || !data) throw new Error(data?.error ?? "L’assistant IA n’a pas pu répondre. Réessayez.");
  return data;
}

/** Proposition de l'IA : le vendeur relit, modifie, puis l'applique au formulaire (ou l'ignore). */
export function AiSuggestionPanel({
  suggestion,
  onApply,
  onDismiss,
}: {
  suggestion: AiSuggestion;
  onApply: (values: AiSuggestion) => void;
  onDismiss: () => void;
}) {
  const [name, setName] = useState(suggestion.name);
  const [description, setDescription] = useState(suggestion.description);
  const [preview, setPreview] = useState(true);

  return (
    <div aria-labelledby="ai-suggestion-title" className="ai-suggestion" role="region">
      <div className="ai-suggestion-head">
        <Sparkles aria-hidden="true" size={18} />
        <strong id="ai-suggestion-title">Proposition de l’assistant IA</strong>
      </div>
      <p className="v-small v-muted">Relisez et corrigez si besoin : rien n’est enregistré tant que vous n’avez pas validé puis enregistré le produit.</p>

      <label className="v-field">
        Nom proposé
        <input maxLength={120} onChange={(event) => setName(event.target.value)} value={name} />
      </label>

      <div className="v-field">
        <span className="ai-suggestion-label">
          Description proposée
          <button className="v-link-inline ai-suggestion-toggle" onClick={() => setPreview(!preview)} type="button">
            {preview ? "Modifier le texte" : "Voir l’aperçu"}
          </button>
        </span>
        {preview ? (
          <div className="ai-suggestion-preview">
            <RichText source={description} />
          </div>
        ) : (
          <textarea maxLength={2000} onChange={(event) => setDescription(event.target.value)} rows={8} value={description} />
        )}
      </div>

      <div className="ai-suggestion-actions">
        <button className="btn btn-primary" disabled={name.trim().length < 2} onClick={() => onApply({ name: name.trim(), description: description.trim() })} type="button">
          Utiliser ces informations
        </button>
        <button className="btn btn-secondary" onClick={onDismiss} type="button">
          Ignorer
        </button>
      </div>
    </div>
  );
}

const icons = { danger: CircleAlert, warning: TriangleAlert, tip: Lightbulb };

/** Amène le vendeur sur le champ à compléter (et y place le curseur quand c'est un champ de saisie). */
function goTo(target: string) {
  const element = document.getElementById(target);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  if (element.matches("input, select, textarea")) (element as HTMLElement).focus({ preventScroll: true });
}

/** Carte « Infos pratiques » : avancement de la fiche et contrôles instantanés de la saisie (sans IA). */
export function ProductNotices({ notices, completion }: { notices: ProductNotice[]; completion: { steps: CompletionStep[] } }) {
  return (
    <section aria-labelledby="product-notices-title" className="v-card product-notices">
      <h2 className="v-card-title" id="product-notices-title">Infos pratiques</h2>
      <ul className="product-steps">
        {completion.steps.map((step) => (
          <li key={step.id}>
            <button className={step.done ? "is-done" : undefined} onClick={() => goTo(step.target)} type="button">
              <span aria-hidden="true" className="product-step-dot">{step.done && <Check size={12} weight="bold" />}</span>
              {step.label}
              <span className="visually-hidden">{step.done ? " : complété" : " : à compléter"}</span>
            </button>
          </li>
        ))}
      </ul>
      {notices.length === 0 ? (
        <p className="v-small v-muted">Tout est en ordre. Votre fiche produit est prête à être enregistrée.</p>
      ) : (
        <ul className="product-notice-list">
          {notices.map((notice) => {
            const Icon = icons[notice.level];
            return (
              <li className={`product-notice is-${notice.level}`} key={notice.id}>
                <Icon aria-hidden="true" size={16} />
                <span>{notice.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
