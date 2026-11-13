// Crédits de l'assistant IA (nom et description d'un produit à partir des photos).
// Chaque boutique reçoit des crédits du mois (5 par défaut, réglables par l'administration), remis à zéro
// le 1er de chaque mois (heure de Douala), et peut recevoir des crédits bonus de l'administration, qui ne
// se périment pas et servent une fois les crédits du mois épuisés. Une demande à l'IA coûte 1 crédit.
// Module sans dépendance serveur : utilisé par le serveur, l'administration et les tests.

/** Crédits offerts chaque mois à une boutique sans réglage particulier. */
export const defaultMonthlyAiCredits = 5;
/** Limites des réglages de l'administration. */
export const maxMonthlyAiCredits = 1000;
export const maxBonusGrant = 1000;

export type AiCreditState = {
  /** Crédits du mois réglés pour la boutique (null : valeur par défaut). */
  monthlyAllowance: number | null;
  /** Demandes déjà faites ce mois-ci avec les crédits du mois. */
  usedThisMonth: number;
  /** Crédits bonus restants. */
  bonus: number;
};

export function monthlyAllowance(value: number | null | undefined) {
  return value ?? defaultMonthlyAiCredits;
}

/** Crédits restants : ceux du mois, les bonus, et le total. */
export function aiCreditBalance(state: AiCreditState) {
  const allowance = monthlyAllowance(state.monthlyAllowance);
  const monthly = Math.max(0, allowance - state.usedThisMonth);
  const bonus = Math.max(0, state.bonus);
  return { allowance, monthly, bonus, total: monthly + bonus };
}

/** Source du prochain crédit : ceux du mois d'abord, puis les bonus ; null quand il n'y en a plus. */
export function nextCreditSource(state: AiCreditState): "MONTHLY" | "BONUS" | null {
  const balance = aiCreditBalance(state);
  if (balance.monthly > 0) return "MONTHLY";
  if (balance.bonus > 0) return "BONUS";
  return null;
}

/** Début du mois en cours à Douala (UTC+1, sans heure d'été), en heure UTC. */
export function monthStart(now = new Date()) {
  const douala = new Date(now.getTime() + 60 * 60_000);
  return new Date(Date.UTC(douala.getUTCFullYear(), douala.getUTCMonth(), 1) - 60 * 60_000);
}

/** Premier jour du mois suivant (date de renouvellement), en heure UTC. */
export function nextMonthStart(now = new Date()) {
  const douala = new Date(now.getTime() + 60 * 60_000);
  return new Date(Date.UTC(douala.getUTCFullYear(), douala.getUTCMonth() + 1, 1) - 60 * 60_000);
}

export function creditsLabel(count: number) {
  return `${count} crédit${count > 1 ? "s" : ""}`;
}
