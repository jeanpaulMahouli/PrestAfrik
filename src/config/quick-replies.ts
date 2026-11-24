// Réponses rapides de la boîte de réception (administration) : insérées dans le champ de réponse, puis
// modifiables avant l'envoi. {prenom} est remplacé par le prénom du vendeur.

export const quickReplies = [
  { label: "Merci pour l’avis", body: "Bonjour {prenom}, merci beaucoup pour votre avis ! Il aide toute l’équipe à améliorer PrestAfrik. Belle journée de ventes !" },
  { label: "Idée retenue", body: "Bonjour {prenom}, merci pour votre idée ! Nous l’avons ajoutée à notre liste d’améliorations et vous préviendrons dès qu’elle sera disponible." },
  { label: "Besoin de précisions", body: "Bonjour {prenom}, merci pour votre message. Pouvez-vous nous donner un peu plus de détails (page concernée, capture d’écran) pour que nous puissions vous aider ?" },
  { label: "Problème corrigé", body: "Bonjour {prenom}, le problème que vous avez signalé est corrigé. Merci de nous l’avoir signalé ! Dites-nous si tout fonctionne de votre côté." },
  { label: "Aide à la publication", body: "Bonjour {prenom}, pour mettre votre boutique en ligne : ajoutez au moins un produit avec photo et prix, puis touchez « Publier » sur l’accueil de votre tableau de bord. Nous restons disponibles sur WhatsApp." },
] as const;
