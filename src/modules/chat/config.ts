import { z } from "zod";

// Assistant WhatsApp de la boutique (brief §6.15) : réponses guidées rédigées par le vendeur,
// sans IA. Texte simple uniquement ; variables en liste blanche.

export const chatTransferVariables = ["boutique", "question", "produit", "page"] as const;

export const defaultChatConfig = {
  enabled: false,
  welcomeMessage: "Bonjour et bienvenue chez {boutique} ! Comment puis-je vous aider ?",
  transferTemplate: "Bonjour {boutique}, {question}. Merci !",
  offHoursMessage: "",
  showOnHome: true,
  showOnProduct: true,
  showOnCart: true,
  showOnCheckout: false,
  quickReplies: [
    { label: "Livraison et délais", answer: "Nous livrons dans votre ville. Les frais et délais s’affichent au moment de la commande.", enabled: true },
    { label: "Moyens de paiement", answer: "Le paiement se fait à la livraison, en espèces ou par mobile money.", enabled: true },
  ],
};

const plainText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} : ${max} caractères au maximum.`)
    .refine((value) => !/<[a-z/!]/i.test(value), `${label} : texte simple uniquement, sans HTML.`);

const allowedVariables = (template: string, allowed: readonly string[]) =>
  [...template.matchAll(/\{(\w+)\}/g)].every((match) => allowed.includes(match[1]));

export const chatConfigSchema = z.object({
  enabled: z.boolean(),
  welcomeMessage: plainText(200, "Message d’accueil")
    .pipe(z.string().min(5, "Écrivez un message d’accueil."))
    .refine((value) => allowedVariables(value, ["boutique"]), "Message d’accueil : seule la variable {boutique} est disponible."),
  transferTemplate: plainText(300, "Message de transfert")
    .pipe(z.string().min(5, "Écrivez le message prérempli."))
    .refine((value) => allowedVariables(value, chatTransferVariables), "Message de transfert : variables autorisées {boutique}, {question}, {produit}, {page}."),
  offHoursMessage: plainText(300, "Message hors horaires"),
  showOnHome: z.boolean(),
  showOnProduct: z.boolean(),
  showOnCart: z.boolean(),
  showOnCheckout: z.boolean(),
  quickReplies: z
    .array(
      z.object({
        label: plainText(30, "Texte du bouton").pipe(z.string().min(2, "Chaque question rapide a besoin d’un texte de bouton.")),
        answer: plainText(500, "Réponse").pipe(z.string().min(2, "Chaque question rapide a besoin d’une réponse.")),
        enabled: z.boolean(),
      }),
    )
    .max(6, "6 questions rapides au maximum."),
});

export type ChatConfigInput = z.infer<typeof chatConfigSchema>;

/** Remplit les variables d'un modèle ; les variables inconnues sont laissées telles quelles. */
export function fillChatTemplate(template: string, values: Partial<Record<(typeof chatTransferVariables)[number], string>>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key as keyof typeof values];
    return value === undefined ? match : value;
  });
}
