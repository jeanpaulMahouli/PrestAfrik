/**
 * Contenu de la landing page : textes, liens, images et témoignages.
 * Modifiez ce fichier pour changer ce qui s'affiche, sans toucher aux composants ni au CSS.
 * Les images sont dans public/landing/ (screens, dashboard, people, logos, icons, emoji).
 */

export type NavLink = { label: string; href: string };

export const navLinks: NavLink[] = [
  { label: "Accueil", href: "#accueil" },
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "À propos", href: "#temoignages" },
  { label: "Démo", href: "#demo" },
  { label: "Blog", href: "#temoignages" },
  { label: "Contact", href: "#contact" },
];

export const authLinks = {
  login: { label: "Se connecter", href: "/connexion" },
  signup: { label: "Créer ma boutique", href: "/inscription" },
  /** Remplace les deux liens ci-dessus quand le vendeur est déjà connecté. */
  dashboard: { label: "Mon espace", href: "/dashboard" },
};

export const hero = {
  title: "Votre commerce mérite une vitrine à sa hauteur",
  subtitle:
    "Une boutique en ligne gratuite, professionnelle et prête en 5 minutes. Les commandes arrivent sur WhatsApp, le paiement se fait à la livraison.",
  primaryCta: { label: "Créer ma boutique gratuitement", href: "/inscription" },
  secondaryCta: { label: "Voir la démo", href: "#demo" },
  phoneScreen: "/landing/screens/hero-boutique.webp",
  /** Petites photos de la carte flottante à gauche du téléphone. */
  community: [
    "/landing/people/vendeur-1.webp",
    "/landing/people/vendeuse-2.webp",
    "/landing/people/vendeur-3.webp",
    "/landing/people/vendeuse-4.webp",
  ],
  quote: {
    name: "Linda",
    photo: "/landing/people/linda.webp",
    text: "J’ai enfin ma propre boutique en ligne, qui répond aux besoins de ma communauté\u00a0!",
  },
};

export const partners = {
  title: "Ces boutiques vendent déjà avec PrestAfrik",
  logos: [
    { src: "/landing/logos/partenaire-1.svg", alt: "Logoipsum Brand Standard", width: 156, height: 35 },
    { src: "/landing/logos/partenaire-2.svg", alt: "Logoipsum", width: 36, height: 36 },
    { src: "/landing/logos/partenaire-3.svg", alt: "Logo", width: 155, height: 36 },
    { src: "/landing/logos/partenaire-4.svg", alt: "Logoipsum", width: 90, height: 36 },
    { src: "/landing/logos/partenaire-5.svg", alt: "Logoipsum", width: 202, height: 40 },
    { src: "/landing/logos/partenaire-6.svg", alt: "Logoipsum", width: 60, height: 40 },
  ],
};

export const dashboard = {
  title: "Tout ce dont votre boutique a besoin, réuni dans un seul tableau de bord",
  subtitle:
    "Commandes, produits, clients, livraisons et équipe : gérez tout depuis un seul espace, sur ordinateur comme sur téléphone. Vous savez toujours où vous en êtes, sans tableur ni carnet.",
  features: [
    {
      title: "Tableau de bord",
      lead: "Un coup d’œil, chaque matin",
      text: "Nouvelles commandes à valider, argent reçu, produits épuisés : tout ce qui compte est sur la première page.",
      image: "/landing/dashboard/accueil.webp",
    },
    {
      title: "Commandes",
      lead: "Trois boutons, pas plus",
      text: "Continuer sur WhatsApp, Valider la commande ou Voir la commande en détail. Pas d’étapes compliquées : la commande est nouvelle, validée ou annulée.",
      image: "/landing/dashboard/commandes.webp",
    },
    {
      title: "Argent reçu",
      lead: "",
      text: "Chaque commande validée est comptée automatiquement, jour après jour.",
      image: "/landing/dashboard/argent.webp",
    },
  ],
};

export const clientSide = {
  title: "Côté client : simple, rapide, adapté",
  subtitle:
    "Vos clients achètent sur leur téléphone. Votre boutique aussi est faite pour ça. Pas d’application à télécharger, pas de paiement en ligne : ils paient à la livraison, en toute confiance.",
  steps: [
    { label: "Votre boutique", image: "/landing/screens/client-boutique.webp" },
    { label: "Détail produit", image: "/landing/screens/client-detail.webp" },
    { label: "Commande en 1 minute", image: "/landing/screens/client-commande.webp" },
    { label: "Suivi sans compte", image: "/landing/screens/client-suivi.webp" },
  ],
  cta: { label: "Créer ma boutique gratuitement", href: "/inscription" },
};

export type Testimonial = { name: string; role: string; photo: string; text: string; rating: number };

/** Témoignages fictifs : remplacez les textes et les photos (public/landing/people/) par de vrais retours clients. */
export const testimonials: { title: string; items: Testimonial[] } = {
  title: "Des histoires vraies, issues de boutiques réelles",
  items: [
    {
      name: "Awa Mbarga",
      role: "Fondatrice, Mboa Style · Douala",
      photo: "/landing/people/vendeuse-4.webp",
      text: "Avant, je notais tout dans un cahier. Maintenant les commandes arrivent sur WhatsApp avec le bon montant, et je vois chaque soir ce que j’ai encaissé.",
      rating: 5,
    },
    {
      name: "Christian Tchoupo",
      role: "Gérant, BestShop · Yaoundé",
      photo: "/landing/people/vendeur-3.webp",
      text: "Mes clients commandent sans créer de compte et paient à la livraison. En un mois, j’ai reçu deux fois plus de commandes qu’avant.",
      rating: 5,
    },
    {
      name: "Linda Ngo Bassa",
      role: "Créatrice, Linda Beauty · Bafoussam",
      photo: "/landing/people/linda.webp",
      text: "J’ai créé ma boutique en une soirée, depuis mon téléphone. Mes clientes adorent suivre leur commande sans rien installer.",
      rating: 5,
    },
    {
      name: "Samuel Ekane",
      role: "Responsable, Ekane Électro · Limbé",
      photo: "/landing/people/vendeur-1.webp",
      text: "Mon équipe valide les commandes, le livreur voit ses courses : chacun a ses accès et je garde la main sur tout.",
      rating: 5,
    },
    {
      name: "Grâce Fouda",
      role: "Vendeuse, Mama Pagne · Kribi",
      photo: "/landing/people/vendeuse-2.webp",
      text: "Je partage le lien de ma boutique dans mes statuts WhatsApp et les commandes tombent toutes seules. C’est simple et professionnel.",
      rating: 5,
    },
  ],
};

export const faq = {
  title: "Questions fréquentes",
  items: [
    {
      question: "Mes clients doivent-ils créer un compte ?",
      answer:
        "Non. Vos clients commandent en quelques secondes avec leur nom, leur numéro WhatsApp et leur adresse de livraison. Aucun compte à créer, aucune application à télécharger.",
    },
    {
      question: "Comment mes clients paient-ils ?",
      answer:
        "Ils paient à la livraison, en espèces ou par mobile money, directement au livreur ou en boutique. Aucun paiement en ligne n’est demandé sur votre boutique.",
    },
    {
      question: "Comment fonctionnent les frais de livraison ?",
      answer:
        "Vous définissez vos zones de livraison et vos tarifs. Quand le montant n’est pas encore connu, la commande indique « frais à confirmer » et vous le précisez avec le client sur WhatsApp.",
    },
    {
      question: "Quelle différence entre le lien wa.me et l’API WhatsApp ?",
      answer:
        "Avec le lien wa.me, aucun compte technique n’est nécessaire : le message est préparé et vous confirmez vous-même sur WhatsApp. Avec l’API WhatsApp, les messages partent automatiquement et leurs statuts sont suivis dans PrestAfrik.",
    },
    {
      question: "Puis-je inviter mon équipe ?",
      answer:
        "Oui. Invitez vos collaborateurs par e-mail et donnez à chacun les droits adaptés : propriétaire, gestionnaire, vendeur, livreur ou lecture seule.",
    },
  ],
};

export const finalCta = {
  kicker: "Aucun paiement requis",
  title: "Vos prochains clients vous attendent déjà !",
  subtitle: "C’est gratuit, sans engagement, et vous n’avez besoin d’aucune compétence technique.",
  primary: { label: "Créer ma boutique gratuitement", href: "/inscription" },
  secondary: { label: "Réserver une démo", href: "mailto:contact@prestafrik.com?subject=D%C3%A9mo%20PrestAfrik" },
};

export const footer = {
  tagline: "La boutique en ligne pensée pour vous !",
  columns: [
    { title: "Liens rapides", links: navLinks },
    {
      title: "Ressources",
      links: [
        { label: "Centre d’aide", href: "#faq" },
        { label: "Blog", href: "#" },
        { label: "Webinaires", href: "#" },
        { label: "Modèles", href: "#" },
        { label: "Études de cas", href: "#temoignages" },
        { label: "Communauté", href: "#" },
      ],
    },
    {
      title: "Entreprise",
      links: [
        { label: "À propos", href: "#temoignages" },
        { label: "Mentions légales", href: "/legal/mentions-legales" },
        { label: "Contact", href: "mailto:contact@prestafrik.com" },
        { label: "Confidentialité", href: "/legal/politique-de-confidentialite" },
        { label: "Conditions générales", href: "/legal/conditions-generales" },
        { label: "Conditions de vente", href: "/legal/conditions-de-vente" },
      ],
    },
  ],
  socialTitle: "Réseaux sociaux",
  socials: [
    { label: "X (Twitter)", href: "#", icon: "/landing/icons/x.svg" },
    { label: "Facebook", href: "#", icon: "/landing/icons/facebook.svg" },
    { label: "Instagram", href: "#", icon: "/landing/icons/instagram.svg" },
    { label: "YouTube", href: "#", icon: "/landing/icons/youtube.svg" },
  ],
  copyright: "© 2026 PrestAfrik. Tous droits réservés.",
  madeBy: "Zalam",
};
