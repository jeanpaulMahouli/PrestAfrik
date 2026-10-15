// Liens « click to chat » wa.me : aucune API Meta, le message est préparé et
// l'utilisateur l'envoie lui-même depuis son application WhatsApp.

const maxMessageLength = 1500;

/**
 * Normalise un numéro saisi par le vendeur au format international (+XXXXXXXX).
 * Un numéro camerounais à 9 chiffres sans indicatif reçoit +237.
 */
export function normalizeWhatsappNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[+0-9\s().-]+$/.test(trimmed)) return null;
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("00")) digits = digits.slice(2);
  else if (!trimmed.startsWith("+") && /^[26]\d{8}$/.test(digits)) digits = `237${digits}`;
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  if (digits.startsWith("237") && !/^237[2-9]\d{8}$/.test(digits)) return null;
  return `+${digits}`;
}

export function buildWaMeUrl(internationalNumber: string, message?: string) {
  const digits = internationalNumber.replace(/\D/g, "");
  const url = new URL(`https://wa.me/${digits}`);
  if (message) url.searchParams.set("text", message.slice(0, maxMessageLength));
  return url.toString();
}

export function formatWhatsappNumber(internationalNumber: string) {
  const digits = internationalNumber.replace(/\D/g, "");
  if (/^237\d{9}$/.test(digits)) {
    return `+237 ${digits.slice(3, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return `+${digits}`;
}

function formatAmount(amountXaf: number | null) {
  return amountXaf === null
    ? "à confirmer"
    : `${new Intl.NumberFormat("fr-FR").format(amountXaf).replace(/\s/g, " ")} FCFA`;
}

export type ProductWhatsappOrderInput = {
  storeName: string;
  productName: string;
  variantLabel: string | null;
  quantity: number;
  unitPriceXaf: number;
  productUrl: string;
};

/** Message envoyé par le client à la boutique depuis une fiche produit. */
export function buildProductWhatsappOrderMessage(input: ProductWhatsappOrderInput) {
  return [
    `Bonjour ${input.storeName}, je souhaite commander :`,
    `• ${input.productName}${input.variantLabel ? ` (${input.variantLabel})` : ""} × ${input.quantity}`,
    `Prix unitaire : ${formatAmount(input.unitPriceXaf)}`,
    `Total produits : ${formatAmount(input.unitPriceXaf * input.quantity)}`,
    "",
    `Lien du produit : ${input.productUrl}`,
    "",
    "Ma ville et mon quartier : ",
  ].join("\n");
}
