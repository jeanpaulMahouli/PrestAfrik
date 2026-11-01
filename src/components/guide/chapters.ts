import type { ClipName } from "./guide-clip";

export type GuideLesson = { id: string; title: string; summary: string; clip?: ClipName };
export type GuideChapter = {
  id: string;
  title: string;
  icon: "rocket" | "dashboard" | "package" | "bag" | "star" | "truck" | "users" | "wallet" | "store" | "megaphone" | "team";
  summary: string;
  lessons: GuideLesson[];
};

/** Sommaire du guide vendeur : un titre, une promesse courte, une illustration (la vraie interface). */
export const guideChapters: GuideChapter[] = [
  {
    id: "creer-boutique",
    title: "Créer votre boutique",
    icon: "rocket",
    summary: "Votre boutique en ligne en 5 minutes, sans aucune compétence technique.",
    lessons: [
      { id: "nom-activite", title: "Le nom et l’activité", summary: "Un nom, une activité : votre adresse web est prête instantanément.", clip: "creer-boutique-1" },
      { id: "lieu-contact", title: "La localisation et les coordonnées", summary: "Vos clients savent où vous trouver et vous écrivent directement sur WhatsApp.", clip: "creer-boutique-2" },
      { id: "theme-couleurs", title: "Le thème, les couleurs et le logo", summary: "Une vitrine à votre image, en quelques touches.", clip: "creer-boutique-3" },
      { id: "produit-publication", title: "Premier produit, livraison et publication", summary: "Votre premier produit en ligne et des frais de livraison clairs : vous êtes prêt à vendre.", clip: "creer-boutique-4" },
    ],
  },
  {
    id: "tableau-de-bord",
    title: "Votre tableau de bord",
    icon: "dashboard",
    summary: "Toute votre activité d’un coup d’œil, chaque matin.",
    lessons: [
      { id: "chiffres-cles", title: "Vos chiffres clés", summary: "Commandes, argent encaissé, visites : vous pilotez votre boutique en temps réel.", clip: "tableau-de-bord" },
      { id: "menu", title: "Le menu", summary: "Chaque outil à portée de pouce.", clip: "menu" },
      { id: "partager", title: "Partager votre boutique", summary: "Un lien, un QR code : vos clients vous trouvent partout.", clip: "partager" },
    ],
  },
  {
    id: "produits",
    title: "Vos produits",
    icon: "package",
    summary: "Un catalogue soigné qui donne envie d’acheter.",
    lessons: [
      { id: "ajouter-produit", title: "Ajouter un produit", summary: "Photos, prix, promotion : en ligne en moins d’une minute.", clip: "ajouter-produit" },
      { id: "gerer-produits", title: "Gérer vos produits", summary: "Mettez vos meilleures ventes en avant, dupliquez, archivez en un geste.", clip: "gerer-produits" },
    ],
  },
  {
    id: "commandes",
    title: "Vos commandes",
    icon: "bag",
    summary: "Chaque commande arrive complète : vous confirmez sur WhatsApp et vous encaissez.",
    lessons: [{ id: "traiter-commande", title: "Traiter une commande", summary: "WhatsApp, « Valider », c’est vendu : le montant rejoint votre caisse.", clip: "commandes" }],
  },
  {
    id: "avis",
    title: "Les avis clients",
    icon: "star",
    summary: "Les avis valorisent vos produits : de vrais témoignages, publiés aussitôt et jamais retirés, rassurent vos futurs acheteurs.",
    lessons: [
      { id: "client-laisse-avis", title: "Côté client : laisser un avis", summary: "Une note, quelques mots : vos clients deviennent vos meilleurs ambassadeurs.", clip: "avis-client" },
      { id: "vendeur-suit-avis", title: "Côté vendeur : suivre vos avis", summary: "Votre note moyenne et chaque avis, réunis au même endroit.", clip: "avis-vendeur" },
    ],
  },
  {
    id: "livraisons",
    title: "Livraisons et retrait",
    icon: "truck",
    summary: "Des frais clairs et un total juste, avant même la commande.",
    lessons: [{ id: "zones", title: "Ajouter une zone de livraison", summary: "Une zone, un prix, un délai : vos clients savent à quoi s’attendre.", clip: "livraisons" }],
  },
  {
    id: "clients",
    title: "Vos clients",
    icon: "users",
    summary: "Votre fichier clients se construit tout seul, commande après commande.",
    lessons: [{ id: "fichier-clients", title: "Le fichier clients", summary: "Repérez qui relancer et fidélisez vos meilleurs clients.", clip: "clients" }],
  },
  {
    id: "argent",
    title: "L’argent reçu",
    icon: "wallet",
    summary: "Vous savez toujours combien vous avez encaissé.",
    lessons: [{ id: "suivre-argent", title: "Suivre vos encaissements", summary: "Aujourd’hui, ce mois-ci ou la période de votre choix.", clip: "argent" }],
  },
  {
    id: "ma-boutique",
    title: "Ma boutique",
    icon: "store",
    summary: "Votre vitrine, votre style.",
    lessons: [{ id: "apparence", title: "Apparence et informations", summary: "Thème, couleurs, logo : vous voyez le résultat avant de publier.", clip: "ma-boutique" }],
  },
  {
    id: "marketing",
    title: "Marketing",
    icon: "megaphone",
    summary: "Faites revenir vos clients et mettez vos offres en vitrine.",
    lessons: [{ id: "outils-marketing", title: "Bannière, popup et campagnes", summary: "Des visuels qui attirent l’œil et des messages ciblés qui font revenir.", clip: "marketing" }],
  },
  {
    id: "equipe",
    title: "Votre équipe",
    icon: "team",
    summary: "Vendez à plusieurs, en toute sécurité.",
    lessons: [{ id: "inviter", title: "Inviter un membre", summary: "Invitez, choisissez le rôle : chacun voit uniquement ce qu’il doit voir.", clip: "equipe" }],
  },
];
