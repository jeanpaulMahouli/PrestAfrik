import type { OrderProcessingStatus } from "@prisma/client";

// Cycle de vie simplifié d'une commande (ADR-013) : pas de confirmation du client, pas d'étapes de
// traitement. Une commande est « Nouvelle », puis le vendeur la marque « Validée » (l'argent est
// compté comme reçu) ou « Annulée ». Les colonnes historiques de la base sont conservées ; seule
// `processingStatus` porte l'état : TO_REVIEW = nouvelle, COMPLETED = validée, CANCELLED = annulée.

export type OrderStage = "NEW" | "VALIDATED" | "CANCELLED";

export function orderStage(processingStatus: OrderProcessingStatus): OrderStage {
  if (processingStatus === "COMPLETED") return "VALIDATED";
  if (processingStatus === "CANCELLED") return "CANCELLED";
  // Anciennes commandes « acceptées » ou « en préparation » : toujours à valider.
  return "NEW";
}

export const stageProcessingStatuses: Record<OrderStage, OrderProcessingStatus[]> = {
  NEW: ["TO_REVIEW", "ACCEPTED", "PREPARING"],
  VALIDATED: ["COMPLETED"],
  CANCELLED: ["CANCELLED"],
};

export const canValidate = (stage: OrderStage) => stage === "NEW";
export const canCancel = (stage: OrderStage) => stage !== "CANCELLED";
