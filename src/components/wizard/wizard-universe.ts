import type { ShopUniverse } from "@/config/marketplace";

/**
 * Textes de l'assistant de création de boutique selon l'univers choisi à l'étape « Activité » :
 * Shopping (produits), Immobilier (biens) ou Services (prestations). L'univers vient de l'activité de la
 * boutique (config/marketplace.ts, universeOfActivity) et décide aussi de sa place sur la marketplace.
 */
export const wizardWording: Record<
  ShopUniverse,
  {
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
  }
> = {
  vente: {
    activityTitle: "Que vendez-vous ?",
    activitySubtitle: "Choisissez votre activité principale pour que nous adaptions les suggestions à votre métier. La liste se filtre au fur et à mesure que vous tapez.",
    descriptionPlaceholder: "Ex. Pagnes, robes et accessoires faits main à Douala. Livraison rapide dans toute la ville.",
    descriptionHelp: "En une ou deux phrases : ce que vous vendez et ce qui vous rend unique.",
    productTitle: "Ajoutons votre premier produit",
    productSubtitle: "C’est facultatif, mais une boutique avec un produit donne tout de suite envie d’acheter ! Jusqu’à 5 photos par produit ; d’autres produits ensuite depuis votre tableau de bord.",
    productName: "Nom du produit",
    productPlaceholder: "Ex. Robe wax Akwa",
    priceLabel: "Prix (en FCFA)",
    pricePlaceholder: "18000",
    deliveryTitle: "Livraison et retrait",
    deliverySubtitle: "Facultatif : indiquez où vous livrez et à quel prix, et si vos clients peuvent venir chercher leur commande. Ils verront le total exact avant de commander. Vous pourrez tout modifier ensuite.",
    zonesLegend: "Zones de livraison",
    zonesHelp: "Un tarif fixe par quartier ou par zone (0 si la livraison est gratuite). Laissez vide si vous ne livrez pas.",
    pickupLegend: "Retrait en boutique",
  },
  immobilier: {
    activityTitle: "Vous proposez des biens immobiliers",
    activitySubtitle: "Maisons, appartements, terrains, bureaux : vos annonces apparaîtront dans l’univers Immobilier de la marketplace, et les demandes de visite arriveront sur WhatsApp.",
    descriptionPlaceholder: "Ex. Agence immobilière à Douala : appartements meublés et terrains titrés, visites sur rendez-vous.",
    descriptionHelp: "En une ou deux phrases : le type de biens, les quartiers, et ce qui vous distingue (agence, propriétaire…).",
    productTitle: "Ajoutons votre premier bien",
    productSubtitle: "C’est facultatif, mais une annonce avec photos attire tout de suite des demandes de visite ! Jusqu’à 5 photos par bien ; d’autres annonces ensuite depuis votre tableau de bord.",
    productName: "Titre de l’annonce",
    productPlaceholder: "Ex. Appartement 2 chambres meublé, Bonamoussadi",
    priceLabel: "Prix ou loyer mensuel (en FCFA)",
    pricePlaceholder: "150000",
    deliveryTitle: "Visites",
    deliverySubtitle: "Facultatif : indiquez les quartiers où se trouvent vos biens et frais éventuels de visite, et où vous recevez. Vous pourrez tout modifier ensuite.",
    zonesLegend: "Quartiers et frais de visite",
    zonesHelp: "Un quartier par ligne, avec les frais de visite (0 si la visite est gratuite). Laissez vide si vous ne précisez pas.",
    pickupLegend: "Rendez-vous à l’agence",
  },
  services: {
    activityTitle: "Vous proposez des services",
    activitySubtitle: "Coiffure, réparation, traiteur, transport, événementiel… vos prestations apparaîtront dans l’univers Services de la marketplace, et les demandes de devis arriveront sur WhatsApp.",
    descriptionPlaceholder: "Ex. Coiffure à domicile à Yaoundé : tresses, tissages et soins, 7 jours sur 7.",
    descriptionHelp: "En une ou deux phrases : vos prestations, où vous intervenez et ce qui vous rend unique.",
    productTitle: "Ajoutons votre première prestation",
    productSubtitle: "C’est facultatif, mais une prestation avec photos et prix de départ rassure tout de suite ! Jusqu’à 5 photos ; d’autres prestations ensuite depuis votre tableau de bord.",
    productName: "Nom de la prestation",
    productPlaceholder: "Ex. Tresses africaines (longueur épaules)",
    priceLabel: "Prix de départ (en FCFA)",
    pricePlaceholder: "8000",
    deliveryTitle: "Zones d’intervention",
    deliverySubtitle: "Facultatif : indiquez où vous vous déplacez et à quel prix, et si vos clients peuvent venir à vous. Vous pourrez tout modifier ensuite.",
    zonesLegend: "Zones d’intervention (déplacement)",
    zonesHelp: "Un tarif de déplacement par quartier ou par zone (0 si le déplacement est gratuit). Laissez vide si vous ne vous déplacez pas.",
    pickupLegend: "Accueil sur place (salon, atelier)",
  },
};
