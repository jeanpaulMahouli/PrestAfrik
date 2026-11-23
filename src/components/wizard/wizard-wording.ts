/**
 * Textes de l'assistant de création de boutique. Un seul modèle : la boutique, qui vend des produits
 * (les activités restent un simple libellé, sans univers séparé sur la marketplace).
 */
export type WizardWording = {
  activityTitle: string;
  activitySubtitle: string;
  descriptionPlaceholder: string;
  descriptionHelp: string;
  productTitle: string;
  productSubtitle: string;
  productName: string;
  productPlaceholder: string;
  priceLabel: string;
  pricePlaceholder: string;
  deliveryTitle: string;
  deliverySubtitle: string;
  zonesLegend: string;
  zonesHelp: string;
  pickupLegend: string;
};

export const wizardWording: WizardWording = {
  activityTitle: "Que vendez-vous ?",
  activitySubtitle: "",
  descriptionPlaceholder: "Ex. Pagnes, robes et accessoires faits main à Douala. Livraison rapide dans toute la ville.",
  descriptionHelp: "",
  productTitle: "Ajoutons votre premier produit",
  productSubtitle: "Facultatif. 5 photos maximum.",
  productName: "Nom du produit",
  productPlaceholder: "Ex. Robe wax Akwa",
  priceLabel: "Prix (en FCFA)",
  pricePlaceholder: "18000",
  deliveryTitle: "Livraison et retrait",
  deliverySubtitle: "Facultatif.",
  zonesLegend: "Zones de livraison",
  zonesHelp: "0 = livraison gratuite.",
  pickupLegend: "Retrait en boutique",
};
