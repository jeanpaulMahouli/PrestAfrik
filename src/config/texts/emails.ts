// Textes des e-mails (document « PRESTAFRIK-MODELES-EMAILS.md »), centralisés ici : les gabarits ne
// contiennent aucun texte. Vouvoiement. Variables {{nom}} : toute variable absente fait échouer l'envoi.
// Adaptations : commandes simplifiées sans confirmation du client (ADR-013) et gratuité du lancement
// (ADR-014) — les e-mails d'abonnement restent prêts mais ne partent pas tant que BILLING est désactivé.

export type EmailBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "highlight"; text: string };

export type EmailDefinition = {
  group: "Compte et sécurité" | "Équipe" | "Boutique" | "Abonnement" | "Activité" | "Contact";
  name: string;
  subject: string;
  preheader: string;
  title: string;
  blocks: EmailBlock[];
  action?: { label: string };
  /** Encadré crème (sécurité ou information). */
  note?: string;
  /** Envoyé seulement quand les abonnements payants sont actifs. */
  requiresBilling?: boolean;
};

export const emailTexts = {
  E01: {
    group: "Compte et sécurité",
    name: "Code de confirmation de l’adresse e-mail (inscription)",
    subject: "{{code}} est votre code de confirmation PrestAfrik",
    preheader: "Saisissez ce code pour finaliser votre inscription.",
    title: "Bienvenue, {{prenom}} !",
    blocks: [
      { type: "p", text: "Merci d’avoir créé votre compte PrestAfrik. Pour finaliser votre inscription, saisissez ce code à 6 chiffres sur la page d’inscription :" },
      { type: "highlight", text: "{{code}}" },
    ],
    note: "Ce code est valable 10 minutes et ne peut être utilisé qu’une seule fois. Ne le communiquez à personne : l’équipe PrestAfrik ne vous le demandera jamais. Vous n’êtes pas à l’origine de cette inscription ? Ignorez simplement ce message.",
  },
  E02: {
    group: "Compte et sécurité",
    name: "Bienvenue (adresse confirmée)",
    subject: "Votre compte est confirmé : lancez votre boutique !",
    preheader: "Voici comment démarrer en quelques minutes.",
    title: "C’est confirmé, {{prenom}} !",
    blocks: [
      { type: "p", text: "Votre adresse e-mail est confirmée. Bonne nouvelle : PrestAfrik est entièrement gratuit pendant son lancement. Voici les trois étapes pour mettre votre boutique en ligne :" },
      { type: "list", items: ["Créez votre boutique : son nom, votre activité, votre ville et vos coordonnées.", "Ajoutez vos premiers produits, avec jusqu’à 5 photos chacun.", "Partagez le lien ou le QR code de votre boutique avec vos clients."] },
    ],
    action: { label: "Créer ma boutique" },
    note: "Une question ? Répondez simplement à cet e-mail : nous vous répondons avec plaisir.",
  },
  E03: {
    group: "Compte et sécurité",
    name: "Nouveau lien de confirmation",
    subject: "Votre nouveau lien de confirmation PrestAfrik",
    preheader: "L’ancien lien n’est plus valable. Utilisez celui-ci.",
    title: "Voici votre nouveau lien",
    blocks: [
      { type: "p", text: "Vous avez demandé un nouveau lien pour confirmer votre adresse e-mail. Le précédent est désormais désactivé." },
      { type: "p", text: "Cliquez sur le bouton ci-dessous pour terminer la confirmation." },
    ],
    action: { label: "Confirmer mon adresse e-mail" },
    note: "Ce lien est valable 48 heures et ne peut être utilisé qu’une seule fois.",
  },
  E04: {
    group: "Compte et sécurité",
    name: "Réinitialisation du mot de passe",
    subject: "Réinitialisez votre mot de passe PrestAfrik",
    preheader: "Ce lien est valable 60 minutes.",
    title: "Besoin d’un nouveau mot de passe ?",
    blocks: [
      { type: "p", text: "Nous avons reçu une demande de réinitialisation du mot de passe du compte PrestAfrik associé à l’adresse {{email}}." },
      { type: "p", text: "Cliquez sur le bouton ci-dessous pour en choisir un nouveau (8 caractères minimum). Votre mot de passe actuel reste valable tant que vous n’en avez pas choisi un nouveau." },
    ],
    action: { label: "Choisir un nouveau mot de passe" },
    note: "Ce lien est valable 60 minutes et ne peut servir qu’une seule fois. Vous n’avez rien demandé ? Ignorez ce message : votre compte reste protégé.",
  },
  E05: {
    group: "Compte et sécurité",
    name: "Mot de passe modifié (alerte de sécurité)",
    subject: "Votre mot de passe PrestAfrik a été modifié",
    preheader: "Si ce n’était pas vous, agissez dès maintenant.",
    title: "Votre mot de passe a bien été modifié",
    blocks: [
      { type: "p", text: "Le {{date}} à {{heure}} (heure du Cameroun), le mot de passe de votre compte PrestAfrik a été modifié." },
      { type: "p", text: "Par mesure de sécurité, nous vous avons déconnecté de tous vos appareils. Il vous suffit de vous reconnecter avec votre nouveau mot de passe." },
    ],
    action: { label: "Me connecter" },
    note: "Ce n’est pas vous ? Réinitialisez immédiatement votre mot de passe depuis la page de connexion et écrivez-nous : nous vous aiderons à sécuriser votre compte.",
  },
  E06: {
    group: "Compte et sécurité",
    name: "Connexion depuis un nouvel appareil",
    subject: "Nouvelle connexion à votre compte PrestAfrik",
    preheader: "Vérifiez que c’est bien vous.",
    title: "Une nouvelle connexion a été détectée",
    blocks: [
      { type: "p", text: "Votre compte s’est connecté depuis un nouvel appareil." },
      { type: "list", items: ["Date : {{date}} à {{heure}}", "Appareil : {{appareil}}", "Navigateur : {{navigateur}}", "Localisation approximative : {{ville}}"] },
      { type: "p", text: "Si c’est bien vous, vous n’avez rien à faire." },
    ],
    action: { label: "Ce n’était pas moi" },
    note: "Si vous ne reconnaissez pas cette connexion, ce bouton vous permettra de changer votre mot de passe et de déconnecter tous les appareils.",
  },
  E07: {
    group: "Compte et sécurité",
    name: "Changement d’adresse e-mail : confirmation (nouvelle adresse)",
    subject: "Confirmez votre nouvelle adresse e-mail",
    preheader: "Le changement ne sera effectif qu’après votre confirmation.",
    title: "Confirmez votre nouvelle adresse",
    blocks: [{ type: "p", text: "Vous avez demandé à utiliser cette adresse pour votre compte PrestAfrik. Pour valider le changement, cliquez sur le bouton ci-dessous." }],
    action: { label: "Confirmer cette adresse" },
    note: "Ce lien est valable 48 heures. Tant que vous n’avez pas confirmé, votre ancienne adresse reste active.",
  },
  E08: {
    group: "Compte et sécurité",
    name: "Changement d’adresse e-mail : alerte (ancienne adresse)",
    subject: "L’adresse e-mail de votre compte PrestAfrik a changé",
    preheader: "Si vous n’êtes pas à l’origine de ce changement, répondez-nous sans attendre.",
    title: "Votre adresse e-mail a été modifiée",
    blocks: [{ type: "p", text: "L’adresse e-mail de votre compte PrestAfrik est maintenant {{nouvelleAdresse}}. Vous ne recevrez plus de messages sur cette ancienne adresse." }],
    note: "Ce n’est pas vous ? Répondez à cet e-mail immédiatement : nous bloquerons le compte le temps de vérifier.",
  },
  E09: {
    group: "Équipe",
    name: "Invitation à rejoindre une boutique",
    subject: "{{inviteur}} vous invite à rejoindre {{boutique}} sur PrestAfrik",
    preheader: "Vous avez 7 jours pour accepter l’invitation.",
    title: "Vous êtes invité(e) à rejoindre {{boutique}}",
    blocks: [
      { type: "p", text: "{{inviteur}} vous invite à rejoindre la boutique {{boutique}} sur PrestAfrik avec le rôle de {{role}}." },
      { type: "p", text: "{{descriptionRole}}" },
    ],
    action: { label: "Accepter l’invitation" },
    note: "Cette invitation est valable 7 jours et réservée à l’adresse {{email}}. Vous n’avez pas encore de compte ? Vous pourrez en créer un gratuitement en un instant. Vous ne connaissez pas {{inviteur}} ? Ignorez ce message.",
  },
  E10: {
    group: "Équipe",
    name: "Invitation acceptée",
    subject: "{{membre}} a rejoint {{boutique}}",
    preheader: "Votre équipe s’agrandit.",
    title: "Bonne nouvelle : votre équipe s’agrandit !",
    blocks: [
      { type: "p", text: "{{membre}} a accepté votre invitation et fait désormais partie de {{boutique}} avec le rôle de {{role}}." },
      { type: "p", text: "Vous pouvez modifier ses droits ou le retirer de l’équipe à tout moment depuis la page « Mon équipe »." },
    ],
    action: { label: "Voir mon équipe" },
  },
  E11: {
    group: "Équipe",
    name: "Retrait de l’équipe",
    subject: "Votre accès à {{boutique}} a été retiré",
    preheader: "Votre compte PrestAfrik reste actif.",
    title: "Votre accès à {{boutique}} a pris fin",
    blocks: [
      { type: "p", text: "Le propriétaire de {{boutique}} a retiré votre accès à cette boutique. Vous ne pouvez plus consulter ses commandes ni ses clients." },
      { type: "p", text: "Votre compte PrestAfrik reste actif et vos autres boutiques ne sont pas concernées." },
    ],
    note: "Une question ? Contactez directement le propriétaire de la boutique.",
  },
  E12: {
    group: "Équipe",
    name: "Changement de rôle",
    subject: "Votre rôle dans {{boutique}} a changé",
    preheader: "Voici ce que vous pouvez désormais faire.",
    title: "Votre rôle a été mis à jour",
    blocks: [
      { type: "p", text: "Dans la boutique {{boutique}}, votre rôle est maintenant : {{role}}." },
      { type: "p", text: "{{descriptionRole}}" },
    ],
    action: { label: "Ouvrir la boutique" },
  },
  E13: {
    group: "Boutique",
    name: "Boutique publiée",
    subject: "Félicitations, {{boutique}} est en ligne !",
    preheader: "Voici votre lien à partager dès maintenant.",
    title: "Votre boutique prend vie !",
    blocks: [
      { type: "p", text: "{{boutique}} est maintenant visible par vos clients à l’adresse :" },
      { type: "highlight", text: "{{adresseBoutique}}" },
      { type: "p", text: "Pour attirer vos premiers clients, partagez ce lien ou votre QR code sur WhatsApp, vos réseaux sociaux et vos cartes de visite. Et pour bien démarrer :" },
      { type: "list", items: ["Vérifiez vos zones de livraison et leurs frais : vos clients les voient avant de commander.", "Personnalisez vos messages WhatsApp.", "Ajoutez d’autres produits pour donner du choix."] },
    ],
    action: { label: "Aller à mon tableau de bord" },
  },
  E14: {
    group: "Abonnement",
    name: "Votre essai se termine bientôt",
    subject: "Votre essai gratuit PrestAfrik se termine dans {{jours}} jour(s)",
    preheader: "Choisissez une offre pour garder votre boutique en ligne.",
    title: "Plus que {{jours}} jour(s) d’essai",
    blocks: [
      { type: "p", text: "Votre essai gratuit se termine le {{finEssai}}. Pour que {{boutique}} reste en ligne sans interruption, choisissez l’offre qui vous convient." },
      { type: "p", text: "{{offres}}" },
      { type: "p", text: "Aucune donnée n’est perdue : vos produits, vos commandes et vos clients restent conservés." },
    ],
    action: { label: "Choisir mon offre" },
    requiresBilling: true,
  },
  E15: {
    group: "Abonnement",
    name: "Abonnement expiré : ce qui change",
    subject: "Votre abonnement PrestAfrik a expiré : voici ce qui change",
    preheader: "Vos données sont conservées. Réactivez en quelques minutes.",
    title: "Votre abonnement a expiré",
    blocks: [
      { type: "p", text: "L’abonnement de {{boutique}} a expiré le {{dateExpiration}}. Rassurez-vous : vos données sont conservées." },
      { type: "list", items: ["Aujourd’hui : vos commandes en cours restent consultables et traitables.", "À partir du {{dateJ7}} : l’ajout de nouveaux produits et les campagnes sont suspendus.", "À partir du {{dateJ14}} : votre boutique est mise en pause et ne reçoit plus de nouvelles commandes."] },
      { type: "p", text: "Pour tout remettre en route, il vous suffit de choisir une offre." },
    ],
    action: { label: "Réactiver ma boutique" },
    note: "Besoin d’aide pour choisir ? Répondez à cet e-mail.",
    requiresBilling: true,
  },
  E16: {
    group: "Abonnement",
    name: "Paiement confirmé",
    subject: "Paiement confirmé : merci pour votre confiance",
    preheader: "Votre abonnement est actif.",
    title: "Merci, votre paiement est confirmé",
    blocks: [
      { type: "p", text: "Nous avons bien reçu votre paiement. L’abonnement de {{boutique}} est actif." },
      { type: "list", items: ["Offre : {{offre}} ({{periode}})", "Montant : {{montant}}", "Date : {{date}}", "Prochaine échéance : {{echeance}}", "Référence : {{reference}}"] },
    ],
    action: { label: "Voir mon abonnement" },
    note: "Conservez ce message comme confirmation de votre paiement d’abonnement.",
    requiresBilling: true,
  },
  E17: {
    group: "Abonnement",
    name: "Échec du paiement",
    subject: "Votre paiement n’a pas pu aboutir",
    preheader: "Vous pouvez réessayer dès maintenant.",
    title: "Votre paiement n’a pas pu aboutir",
    blocks: [
      { type: "p", text: "Nous n’avons pas pu valider votre paiement pour l’abonnement de {{boutique}}. Le motif indiqué par le prestataire est : {{motif}}." },
      { type: "p", text: "Votre boutique n’est pas affectée pour le moment. Vous pouvez réessayer dès maintenant ou choisir un autre moyen de paiement." },
    ],
    action: { label: "Réessayer le paiement" },
    note: "Si le problème persiste, répondez à cet e-mail : nous vous aiderons à le résoudre.",
    requiresBilling: true,
  },
  E18: {
    group: "Abonnement",
    name: "Changement d’offre",
    subject: "Votre offre PrestAfrik a été mise à jour",
    preheader: "Voici ce qui change pour {{boutique}}.",
    title: "Votre nouvelle offre est active",
    blocks: [
      { type: "p", text: "{{boutique}} est maintenant sur l’offre {{offre}}, à compter du {{dateEffet}}." },
      { type: "list", items: ["Produits : {{quotaProduits}}", "Messages WhatsApp par mois : {{quotaMessages}}", "Membres d’équipe : {{quotaMembres}}"] },
    ],
    action: { label: "Voir mon abonnement" },
    requiresBilling: true,
  },
  E19: {
    group: "Boutique",
    name: "Boutique mise en pause",
    subject: "{{boutique}} est temporairement en pause",
    preheader: "Réactivez-la à tout moment, vos données sont intactes.",
    title: "Votre boutique est en pause",
    blocks: [
      { type: "p", text: "Faute d’abonnement actif, {{boutique}} est temporairement indisponible pour vos clients et ne reçoit plus de nouvelles commandes." },
      { type: "p", text: "Vos produits, vos clients et vos commandes sont conservés. Vous pouvez toujours traiter les commandes déjà enregistrées." },
    ],
    action: { label: "Réactiver ma boutique" },
    requiresBilling: true,
  },
  E20: {
    group: "Boutique",
    name: "Boutique suspendue par l’administration",
    subject: "Votre boutique {{boutique}} a été suspendue",
    preheader: "Voici la raison et comment la rétablir.",
    title: "Votre boutique a été suspendue",
    blocks: [
      { type: "p", text: "Notre équipe a suspendu {{boutique}} pour la raison suivante : {{motif}}." },
      { type: "p", text: "Pendant la suspension, la boutique n’est plus visible par vos clients. Pour comprendre la situation et la rétablir, répondez simplement à cet e-mail : nous reviendrons vers vous rapidement." },
    ],
  },
  E21: {
    group: "Activité",
    name: "Nouvelle commande reçue",
    subject: "Nouvelle commande {{reference}} sur {{boutique}}",
    preheader: "{{nomClient}} vient de commander pour {{total}}.",
    title: "Vous avez une nouvelle commande !",
    blocks: [
      { type: "p", text: "Bravo ! {{nomClient}} vient de passer la commande {{reference}} sur {{boutique}}." },
      { type: "list", items: ["Articles : {{resume}}", "Total : {{total}}", "Livraison : {{livraison}}"] },
      { type: "p", text: "Ouvrez la commande pour écrire au client sur WhatsApp, puis touchez « Valider » une fois payée : le montant sera compté dans votre argent reçu." },
    ],
    action: { label: "Voir la commande" },
    note: "Pour des raisons de confidentialité, le numéro complet du client n’est pas affiché dans cet e-mail.",
  },
  E22: {
    group: "Activité",
    name: "Messages WhatsApp échoués",
    subject: "{{nombre}} message(s) WhatsApp n’ont pas pu partir",
    preheader: "Vos commandes sont bien enregistrées.",
    title: "Des messages WhatsApp n’ont pas pu partir",
    blocks: [
      { type: "p", text: "{{nombre}} message(s) automatiques n’ont pas pu être envoyés à vos clients. Les commandes correspondantes sont bien enregistrées." },
      { type: "p", text: "Raison la plus fréquente : {{raison}}." },
      { type: "p", text: "Vous pouvez écrire aux clients directement depuis les commandes concernées, avec le bouton « Continuer sur WhatsApp »." },
    ],
    action: { label: "Voir les messages échoués" },
  },
  E23: {
    group: "Activité",
    name: "Quota de messages presque atteint",
    subject: "Vous avez utilisé {{pourcentage}} % de vos messages WhatsApp",
    preheader: "Pensez à ajuster votre offre.",
    title: "Votre quota de messages approche de sa limite",
    blocks: [
      { type: "p", text: "{{boutique}} a utilisé {{utilises}} messages sur {{quota}} ce mois-ci. Au-delà, les envois automatiques seront suspendus jusqu’au mois prochain ; vos commandes restent enregistrées dans tous les cas." },
      { type: "p", text: "Pour envoyer davantage de messages, vous pouvez passer à une offre supérieure." },
    ],
    action: { label: "Changer d’offre" },
    requiresBilling: true,
  },
  E24: {
    group: "Contact",
    name: "Accusé de réception du formulaire de contact",
    subject: "Nous avons bien reçu votre message",
    preheader: "Nous vous répondons dès que possible.",
    title: "Merci de nous avoir écrit, {{prenom}} !",
    blocks: [
      { type: "p", text: "Nous avons bien reçu votre message et nous vous répondrons dès que possible, en français, avec plaisir." },
      { type: "p", text: "Pour mémoire, voici ce que vous nous avez écrit :" },
      { type: "quote", text: "{{message}}" },
    ],
    note: "Vous n’avez pas écrit à PrestAfrik ? Ignorez simplement ce message.",
  },
  E25: {
    group: "Compte et sécurité",
    name: "Lien de réinitialisation envoyé par un administrateur",
    subject: "Un conseiller PrestAfrik vous a envoyé un lien pour retrouver l’accès à votre compte",
    preheader: "Ce lien est valable 60 minutes.",
    title: "Retrouvez l’accès à votre compte",
    blocks: [
      { type: "p", text: "À votre demande, un conseiller PrestAfrik vous a envoyé ce lien pour choisir un nouveau mot de passe (8 caractères minimum)." },
      { type: "p", text: "Ce lien est valable 60 minutes et ne peut servir qu’une seule fois." },
    ],
    action: { label: "Choisir un nouveau mot de passe" },
    note: "Vous n’avez fait aucune demande ? Répondez à cet e-mail : nous vérifierons votre compte.",
  },
  E26: {
    group: "Compte et sécurité",
    name: "Droits d’administration accordés",
    subject: "Vous êtes maintenant {{role}} de PrestAfrik",
    preheader: "Vous avez accès à l’espace d’administration.",
    title: "Bienvenue dans l’équipe d’administration, {{prenom}} !",
    blocks: [
      { type: "p", text: "{{auteur}} vous a donné le rôle de {{role}} de PrestAfrik." },
      { type: "list", items: ["{{droits}}", "Chacune de vos actions d’administration est enregistrée dans le journal."] },
      { type: "p", text: "Vous retrouvez l’administration depuis le menu de votre compte, ou avec le bouton ci-dessous." },
    ],
    action: { label: "Ouvrir l’administration" },
    note: "Vous ne vous attendiez pas à ce changement ? Répondez à cet e-mail : nous vérifierons votre compte.",
  },
  E27: {
    group: "Contact",
    name: "Réponse de l’équipe à une demande d’aide",
    subject: "Réponse à votre demande : {{sujet}}",
    preheader: "L’équipe PrestAfrik vous a répondu.",
    title: "Bonjour {{prenom}}, voici notre réponse",
    blocks: [
      { type: "quote", text: "{{reponse}}" },
      { type: "p", text: "Une autre question ? Répondez simplement à cet e-mail : nous restons à votre écoute." },
    ],
  },
} satisfies Record<string, EmailDefinition>;

export type EmailId = keyof typeof emailTexts;

export const emailLayoutTexts = {
  signature: ["À très bientôt,", "L’équipe PrestAfrik"],
  buttonFallback: "Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :",
  help: "Besoin d’aide ? Répondez à cet e-mail ou écrivez à {{contact}}.",
  tagline: "PrestAfrik · La boutique en ligne pensée pour les commerçants camerounais",
  terms: "Conditions d’utilisation",
  privacy: "Confidentialité",
} as const;
