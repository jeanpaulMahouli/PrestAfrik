import type { StatusDisplay } from "@/config/statuses";
import { daysUntil } from "@/modules/subscriptions/dates";

// Libellés de l'administration, sans dépendance serveur (testables).

export type FailureReason = "token" | "template" | "number" | "other";

export const failureReasonLabels: Record<FailureReason, string> = {
  token: "Jeton expiré",
  template: "Modèle non approuvé",
  number: "Numéro invalide",
  other: "Autre erreur",
};

/**
 * Classe une erreur d'envoi WhatsApp. Le texte brut n'est jamais affiché à l'administrateur :
 * il peut contenir le numéro ou le contenu du message (brief §6.13).
 */
export function classifyFailure(error: string | null | undefined): FailureReason {
  const text = (error ?? "").toLowerCase();
  if (/jeton|token|oauth|\b190\b|\b401\b|expir/.test(text)) return "token";
  if (/mod[eè]le|template|\b132\d{3}\b/.test(text)) return "template";
  if (/num[eé]ro|phone|recipient|destinataire|\b131026\b|\b131030\b/.test(text)) return "number";
  return "other";
}

export type SubscriptionLike = { status: string; trialEndsAt: Date; currentPeriodEnd: Date | null; plan: { name: string } } | null;

/** Statut d'abonnement affiché dans l'administration. */
export function subscriptionDisplay(subscription: SubscriptionLike, now = new Date()): StatusDisplay & { offer: string; dueAt: Date | null; group: "active" | "trial" | "expired" | "canceled" | "none" } {
  if (!subscription) return { label: "Aucun", tone: "neutral", offer: "—", dueAt: null, group: "none" };
  if (subscription.status === "TRIAL") {
    if (subscription.trialEndsAt > now) {
      return { label: "Essai", tone: "info", offer: `Essai (${daysUntil(subscription.trialEndsAt, now)} j)`, dueAt: subscription.trialEndsAt, group: "trial" };
    }
    return { label: "Essai expiré", tone: "danger", offer: "—", dueAt: subscription.trialEndsAt, group: "expired" };
  }
  if (subscription.status === "CANCELED") {
    return { label: "Annulé", tone: "neutral", offer: subscription.plan.name, dueAt: subscription.currentPeriodEnd, group: "canceled" };
  }
  if (subscription.status === "ACTIVE" && subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
    return { label: "Actif", tone: "success", offer: subscription.plan.name, dueAt: subscription.currentPeriodEnd, group: "active" };
  }
  return { label: "Expiré", tone: "danger", offer: subscription.plan.name, dueAt: subscription.currentPeriodEnd ?? subscription.trialEndsAt, group: "expired" };
}

/** État de la boutique côté public. */
export function storeStateDisplay(store: { isPublished: boolean; suspendedAt: Date | null }, paused: boolean): StatusDisplay {
  if (store.suspendedAt) return { label: "Suspendue", tone: "danger" };
  if (!store.isPublished) return { label: "Brouillon", tone: "neutral" };
  if (paused) return { label: "Mise en pause", tone: "warning" };
  return { label: "Publiée", tone: "success" };
}
