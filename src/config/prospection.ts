// Critères « Besoin d'assistance » de l'onglet Prospection (administration).
// Une boutique créée à qui il manque au moins un de ces éléments est signalée, et l'info-bulle de
// l'utilisateur liste ce qui manque. Ajoutez, retirez ou modifiez un critère ici : rien d'autre à changer.

export type ProspectStore = {
  name: string;
  activeProducts: number;
  hasLogo: boolean;
  hasWhatsapp: boolean;
  deliveryZones: number;
  pickupEnabled: boolean;
};

export const assistanceCriteria: { key: string; missing: string; isMissing: (store: ProspectStore) => boolean }[] = [
  { key: "produit", missing: "aucun produit en ligne", isMissing: (store) => store.activeProducts === 0 },
  { key: "logo", missing: "pas de logo", isMissing: (store) => !store.hasLogo },
  { key: "whatsapp", missing: "pas de numéro WhatsApp", isMissing: (store) => !store.hasWhatsapp },
  { key: "livraison", missing: "ni zone de livraison ni retrait en boutique", isMissing: (store) => store.deliveryZones === 0 && !store.pickupEnabled },
];

/** Un utilisateur est « actif » s'il a eu une activité depuis ce nombre de jours. */
export const activeUserDays = 30;

/**
 * Messages WhatsApp pré-remplis par défaut, selon le filtre actif ([prenom] et [boutique] sont remplacés).
 * L'administration peut les personnaliser (Prospection → Messages WhatsApp) : le texte enregistré remplace celui-ci.
 */
export const prospectionMessages = {
  default: "Bonjour [prenom], c’est l’équipe PrestAfrik ! Comment se passe votre expérience avec votre boutique [boutique] ? Nous sommes là si vous avez besoin d’aide.",
  actifs: "Bonjour [prenom], c’est l’équipe PrestAfrik ! Merci d’utiliser PrestAfrik pour [boutique]. Avez-vous des idées ou des besoins pour aller plus loin ?",
  "non-publiee": "Bonjour [prenom], c’est l’équipe PrestAfrik ! Votre boutique [boutique] n’est pas encore en ligne. Voulez-vous que nous vous aidions à la publier ?",
  assistance: "Bonjour [prenom], c’est l’équipe PrestAfrik ! Nous avons vu que votre boutique [boutique] est presque prête. Pouvons-nous vous aider à la finaliser ?",
} as const;

export type ProspectionMessageKey = keyof typeof prospectionMessages;
export const prospectionMessageKeys = Object.keys(prospectionMessages) as ProspectionMessageKey[];

/** Quand chaque message est utilisé (formulaire de personnalisation). */
export const prospectionMessageLabels: Record<ProspectionMessageKey, string> = {
  default: "Message par défaut (aucun filtre)",
  actifs: "Filtre « Utilisateurs actifs »",
  "non-publiee": "Filtre « Boutique non publiée »",
  assistance: "Filtre « Besoin d’assistance »",
};
