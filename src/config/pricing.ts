// Offres affichées sur la page Tarifs (et la FAQ). Source unique des prix : aucun montant n'est écrit
// dans le JSX. Ces offres sont commerciales : la facturation réelle reste désactivée pendant le lancement
// (config/billing.ts, ADR-014) et les plafonds appliqués par l'application ne sont pas modifiés ici.

export type PricingPlan = {
  id: "demarrage" | "business" | "market";
  name: string;
  tagline: string;
  monthlyXaf: number;
  yearlyXaf: number;
  recommended?: boolean;
  /** Une ligne par critère de comparaison, dans l'ordre de `pricingCriteria`. */
  features: Record<PricingCriterion, string | boolean>;
};

export type PricingCriterion = "products" | "stores" | "team" | "marketing" | "themes" | "promoStyles" | "pages" | "banner";

/** `prefix` : la valeur seule ne suffit pas à comprendre la ligne (« Classique »), le libellé la précède. */
export const pricingCriteria: { id: PricingCriterion; label: string; prefix?: boolean }[] = [
  { id: "products", label: "Produits" },
  { id: "stores", label: "Boutiques" },
  { id: "team", label: "Équipe" },
  { id: "marketing", label: "Marketing (campagnes WhatsApp)" },
  { id: "themes", label: "Apparence", prefix: true },
  { id: "promoStyles", label: "Styles de promotion", prefix: true },
  { id: "pages", label: "Pages (À propos, Contact…)" },
  { id: "banner", label: "Bannière", prefix: true },
];

export const pricingPlans: PricingPlan[] = [
  {
    id: "demarrage",
    name: "Démarrage",
    tagline: "Pour lancer votre première boutique",
    monthlyXaf: 1_000,
    yearlyXaf: 9_000,
    features: {
      products: "25 produits maximum",
      stores: "1 boutique",
      team: "2 personnes",
      marketing: false,
      themes: "1 catalogue (Catalogue express)",
      promoStyles: "Classique",
      pages: false,
      banner: false,
    },
  },
  {
    id: "business",
    name: "Business",
    tagline: "Pour vendre plus, avec votre équipe",
    monthlyXaf: 3_000,
    yearlyXaf: 29_000,
    recommended: true,
    features: {
      products: "100 produits maximum",
      stores: "5 boutiques maximum",
      team: "5 collaborateurs",
      marketing: true,
      themes: "3 thèmes",
      promoStyles: "Classique, Offre du jour, Vente flash",
      pages: false,
      banner: "Activée, avec popups",
    },
  },
  {
    id: "market",
    name: "Market",
    tagline: "Pour les commerces qui voient grand",
    monthlyXaf: 6_000,
    yearlyXaf: 59_000,
    features: {
      products: "Produits illimités",
      stores: "10 boutiques maximum",
      team: "15 collaborateurs",
      marketing: true,
      themes: "Tous les thèmes premium",
      promoStyles: "Tous les styles",
      pages: true,
      banner: "Activée",
    },
  },
];

/** Essai offert sur l'offre Démarrage. */
export const trialLabel = "1 mois d’essai offert sur l’offre Démarrage";

/** Économie de l'abonnement annuel par rapport à 12 mois payés au mois. */
export function yearlySaving(plan: PricingPlan) {
  const full = plan.monthlyXaf * 12;
  return { amountXaf: full - plan.yearlyXaf, percent: Math.round(((full - plan.yearlyXaf) / full) * 100) };
}

/**
 * Bandeau « Club des 1000 » (6 mois offerts aux premiers vendeurs). Piloté par la variable CLUB_DES_1000 :
 * « off » le ferme sans modifier le code (redémarrage de l'application seulement).
 */
export function clubDes1000() {
  return {
    active: process.env.CLUB_DES_1000 !== "off",
    title: "Club des 1000 : 6 mois offerts",
    text: "Les 1000 premiers vendeurs inscrits profitent de 6 mois gratuits. La promotion se termine bientôt : il reste encore des places.",
    channelUrl: "https://whatsapp.com/channel/0029Vb9M5ZPEwEjzoo7OsM3y",
  };
}
