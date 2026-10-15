// Abonnements payants (ADR-014). Désactivés pendant le lancement : PrestAfrik est gratuit, sans
// limite de produits, de membres ni de messages, et aucune boutique n'est mise en pause.
// Pour les réactiver plus tard : NEXT_PUBLIC_BILLING_ENABLED=true (variable lue aussi par le navigateur pour le menu).
export const billingEnabled = process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";

/** Plafonds techniques appliqués pendant la gratuité (protection contre les abus, pas une offre). */
export const freeUsageLimits = { memberQuota: 50, monthlyMessageQuota: 100_000 } as const;

export function freePlan<T extends { productQuota: number | null; memberQuota: number; monthlyMessageQuota: number }>(plan: T): T {
  return billingEnabled ? plan : { ...plan, productQuota: null, ...freeUsageLimits };
}
