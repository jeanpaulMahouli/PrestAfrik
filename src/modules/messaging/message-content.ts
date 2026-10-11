export type ConfirmationMessageInput = {
  customerName: string;
  storeName: string;
  reference: string;
  trackingUrl: string;
  totalXaf: number | null;
};

export function buildOrderConfirmationMessage(input: ConfirmationMessageInput) {
  const total =
    input.totalXaf === null
      ? "À confirmer"
      : `${new Intl.NumberFormat("fr-FR").format(input.totalXaf)} FCFA`;
  return [
    `Bonjour ${input.customerName}, ta commande ${input.reference} a bien été reçue par ${input.storeName}.`,
    `Montant : ${total}.`,
    `Suivi : ${input.trackingUrl}`,
    "La boutique te contactera pour confirmer les détails. Ce message est une simulation locale.",
  ].join("\n");
}
