// Libellés et couleurs uniformes des statuts (brief §6.6) :
// vert = réussi, jaune = en attente, bleu = en cours, rouge = refusé/annulé/échoué, gris = neutre.
export type Tone = "success" | "warning" | "info" | "danger" | "neutral";
export type StatusDisplay = { label: string; tone: Tone };

/** Statut unique d'une commande, affiché au vendeur et au client (ADR-013). */
export const orderStageDisplay: Record<"NEW" | "VALIDATED" | "CANCELLED", StatusDisplay> = {
  NEW: { label: "Nouvelle", tone: "warning" },
  VALIDATED: { label: "Validée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "danger" },
};
