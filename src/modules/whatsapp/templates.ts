// Modèles de messages du mode lien wa.me (brief §6.8). Variables autorisées (liste blanche) :
// {prenom} {reference} {articles} {montant} {livraison}. Les autres accolades restent telles quelles.

export const templateVariables = ["prenom", "reference", "articles", "montant", "livraison"] as const;
export type TemplateVariable = (typeof templateVariables)[number];

export const defaultCustomerTemplate =
  "Bonjour {boutique}, voici ma commande {reference} : {articles}. Montant : {montant}. Livraison : {livraison}.";
export const defaultStoreTemplate =
  "Bonjour {prenom}, merci pour votre commande {reference} chez {boutique} ! Articles : {articles}. Montant : {montant}. Livraison : {livraison}.";

// Anciens textes par défaut (avec demande de confirmation), remplacés à la lecture.
const legacyDefaults: Record<string, string> = {
  "Bonjour {boutique}, je confirme ma commande {reference} : {articles}. Montant : {montant}. Livraison : {livraison}.": defaultCustomerTemplate,
  "Bonjour {prenom}, {boutique} a bien reçu votre commande {reference}. Articles : {articles}. Montant : {montant}. Livraison : {livraison}. Confirmez-vous votre commande et ce lieu de livraison ?": defaultStoreTemplate,
};

export function currentTemplate(saved: string | null | undefined, fallback: string) {
  if (!saved) return fallback;
  return legacyDefaults[saved] ?? saved;
}

const maxEncodedLength = 1500;

export type TemplateOrder = {
  storeName: string;
  customerName: string;
  reference: string;
  items: { productName: string; variantName: string | null; quantity: number }[];
  totalXaf: number | null;
  deliveryMethod: string;
  city: string;
  neighborhood: string | null;
  landmark: string | null;
};

const amount = (value: number | null) =>
  value === null ? "—" : `${new Intl.NumberFormat("fr-FR").format(value).replace(/[  ]/g, " ")} FCFA`;

function articles(items: TemplateOrder["items"], limit: number) {
  const parts = items.map((item) => `${item.productName}${item.variantName ? ` (${item.variantName.replace(/^[^:]+ : /, "")})` : ""} × ${item.quantity}`);
  if (parts.length <= limit) return parts.join(", ");
  const rest = parts.length - limit;
  return `${parts.slice(0, limit).join(", ")} … et ${rest} autre${rest > 1 ? "s" : ""} article${rest > 1 ? "s" : ""}`;
}

export function renderTemplate(template: string, order: TemplateOrder) {
  const values = (articleLimit: number): Record<string, string> => ({
    boutique: order.storeName,
    prenom: order.customerName.trim().split(/\s+/)[0] ?? order.customerName,
    reference: order.reference.startsWith("#") ? order.reference : `#${order.reference}`,
    articles: articles(order.items, articleLimit),
    montant: amount(order.totalXaf),
    livraison: order.deliveryMethod === "PICKUP" ? "retrait à la boutique" : [order.city, order.neighborhood, order.landmark].filter(Boolean).join(", "),
  });
  // Réduit la liste d'articles jusqu'à obtenir un lien d'une taille raisonnable.
  for (let limit = order.items.length; limit >= 1; limit -= 1) {
    const text = template.replace(/\{(\w+)\}/g, (match, key: string) => values(limit)[key] ?? match);
    if (encodeURIComponent(text).length <= maxEncodedLength || limit === 1) return text.slice(0, 1200);
  }
  return template;
}

/** Vérifie qu'un modèle n'utilise que des variables autorisées. */
export function unknownVariables(template: string) {
  const allowed = new Set<string>([...templateVariables, "boutique"]);
  return [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).filter((name) => !allowed.has(name));
}

export const sampleOrder: TemplateOrder = {
  storeName: "Ma boutique",
  customerName: "Estelle Nkoa",
  reference: "#MB-1042",
  items: [{ productName: "Robe wax Akwa", variantName: null, quantity: 1 }],
  totalXaf: 28500,
  deliveryMethod: "DELIVERY",
  city: "Douala",
  neighborhood: "Akwa",
  landmark: null,
};
