"use client";

import { Check, CircleAlert, Lightbulb, TriangleAlert } from "@/components/ui/icons";
import { AiCreditsCard } from "@/components/catalog/ai-credits-card";
import type { CompletionStep, ProductNotice } from "@/modules/catalog/product-notices";

// Assistant IA (nom et description) et « Infos pratiques » du formulaire produit.

export type AiSuggestion = { name: string; description: string; category?: string | null };

/** Crédits IA restants de la boutique (5 par mois, puis les bonus de l'administration). */
export type AiCreditsInfo = { total: number; monthly: number; bonus: number; allowance: number; renewsAt: string };

/** Erreur de l'assistant, avec le solde de crédits quand le serveur l'a renvoyé. */
export class AiRequestError extends Error {
  constructor(
    message: string,
    readonly credits: AiCreditsInfo | null = null,
  ) {
    super(message);
  }
}

export async function requestAiSuggestion(body: { photos: string[]; name: string }): Promise<AiSuggestion & { credits: AiCreditsInfo | null }> {
  let response: Response;
  try {
    response = await fetch("/api/dashboard/produits/ia", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AiRequestError("Connexion interrompue. Vérifiez votre connexion puis réessayez.");
  }
  const data = (await response.json().catch(() => null)) as (AiSuggestion & { error?: string; credits?: AiCreditsInfo }) | null;
  if (!response.ok || !data) throw new AiRequestError(data?.error ?? "L’assistant IA n’a pas pu répondre. Réessayez.", data?.credits ?? null);
  return { name: data.name, description: data.description, category: data.category ?? null, credits: data.credits ?? null };
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
export function ProductNotices({ notices, completion, credits = null }: { notices: ProductNotice[]; completion: { steps: CompletionStep[] }; /** Crédits IA restants (encart en tête). */ credits?: AiCreditsInfo | null }) {
  return (
    <section aria-labelledby="product-notices-title" className="v-card product-notices">
      <h2 className="v-card-title" id="product-notices-title">Infos pratiques</h2>
      {credits && <AiCreditsCard compact credits={credits} />}
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
