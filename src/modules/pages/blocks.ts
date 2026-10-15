import { z } from "zod";

// Pages éditoriales en blocs structurés (brief §6.5) : aucun HTML ni JavaScript n'est accepté,
// chaque bloc est validé et rendu par un composant dédié.

export const pageKinds = {
  ABOUT: { label: "À propos", slug: "a-propos", title: "À propos" },
  CONTACT: { label: "Contact", slug: "contact", title: "Nous contacter" },
  FAQ: { label: "FAQ", slug: "faq", title: "Questions fréquentes" },
  PROMO: { label: "Page promotionnelle", slug: "promotion", title: "Nos offres du moment" },
} as const;

export type PageKind = keyof typeof pageKinds;
export const pageKindKeys = Object.keys(pageKinds) as PageKind[];

const plain = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} : ${max} caractères au maximum.`)
    .refine((value) => !/<[a-z/!]/i.test(value), `${label} : texte simple uniquement, sans HTML.`);
const required = (max: number, label: string) => plain(max, label).pipe(z.string().min(1, `${label} : ce champ est vide.`));

export const buttonTargets = {
  catalogue: "Page Boutique (catalogue)",
  whatsapp: "Écrire sur WhatsApp",
  contact: "Page Contact",
} as const;

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), text: required(120, "Titre") }),
  z.object({ type: z.literal("paragraph"), text: required(2000, "Paragraphe") }),
  z.object({
    type: z.literal("image"),
    url: z.string().regex(/^\/media\/stores\/[a-z0-9]{20,40}\/pages\/[0-9a-f-]{36}-(?:320|800|1600)\.webp$/, "Image invalide : ajoutez-la de nouveau.").optional(),
    key: z.string().regex(/^tmp\/[0-9a-f-]{36}$/).optional(),
    previewUrl: z.string().optional(),
    alt: plain(200, "Texte alternatif"),
  }),
  z.object({ type: z.literal("list"), items: z.array(required(160, "Élément de liste")).min(1, "Ajoutez au moins un élément à la liste.").max(12, "12 éléments au maximum par liste.") }),
  z.object({ type: z.literal("button"), label: required(40, "Texte du bouton"), target: z.enum(["catalogue", "whatsapp", "contact"]) }),
  z.object({ type: z.literal("qa"), question: required(200, "Question"), answer: required(1000, "Réponse") }),
  z.object({ type: z.literal("contact"), showPhone: z.boolean(), showEmail: z.boolean(), showAddress: z.boolean(), showHours: z.boolean() }),
]);

export type PageBlock = z.infer<typeof blockSchema>;
export const blocksSchema = z.array(blockSchema).max(40, "40 blocs au maximum par page.");

export const blockLabels: Record<PageBlock["type"], string> = {
  heading: "Titre",
  paragraph: "Paragraphe",
  image: "Image",
  list: "Liste",
  button: "Bouton",
  qa: "Question-réponse",
  contact: "Coordonnées",
};

export function emptyBlock(type: PageBlock["type"]): PageBlock {
  switch (type) {
    case "heading":
      return { type, text: "" };
    case "paragraph":
      return { type, text: "" };
    case "image":
      return { type, alt: "" };
    case "list":
      return { type, items: [""] };
    case "button":
      return { type, label: "Voir les produits", target: "catalogue" };
    case "qa":
      return { type, question: "", answer: "" };
    case "contact":
      return { type, showPhone: true, showEmail: true, showAddress: true, showHours: true };
  }
}

/** Blocs proposés à la création d'une page. */
export function starterBlocks(kind: PageKind, storeName: string): PageBlock[] {
  switch (kind) {
    case "ABOUT":
      return [
        { type: "heading", text: "Notre histoire" },
        { type: "paragraph", text: `${storeName} vous accueille avec des produits choisis avec soin. Paiement à la livraison.` },
        { type: "button", label: "Voir les produits", target: "catalogue" },
      ];
    case "CONTACT":
      return [
        { type: "heading", text: "Nous contacter" },
        { type: "contact", showPhone: true, showEmail: true, showAddress: true, showHours: true },
        { type: "button", label: "Écrire sur WhatsApp", target: "whatsapp" },
      ];
    case "FAQ":
      return [
        { type: "qa", question: "Comment payer ma commande ?", answer: "Le paiement se fait à la livraison, en espèces ou par mobile money." },
        { type: "qa", question: "En combien de temps suis-je livré ?", answer: "Les délais s’affichent au moment de la commande, selon votre quartier." },
      ];
    case "PROMO":
      return [
        { type: "heading", text: "Nos offres du moment" },
        { type: "paragraph", text: "Découvrez nos produits en promotion, pour une durée limitée." },
        { type: "button", label: "Voir les produits", target: "catalogue" },
      ];
  }
}
