import { pricingPlans, trialLabel } from "@/config/pricing";

/**
 * Contenu de la landing page : textes, liens, images et témoignages.
 * Modifiez ce fichier pour changer ce qui s'affiche, sans toucher aux composants ni au CSS.
 * Les images sont dans public/landing/ (screens, dashboard, people, logos, icons, emoji).
 */

export type NavLink = { label: string; href: string };

/**
 * Pages désactivées (adresse ajoutée ici) : elles renvoient « page introuvable » et leurs liens disparaissent
 * du menu et du pied de page. Aucun lien ne renvoie vers l'accueil à leur place.
 */
export const disabledPages: ReadonlySet<string> = new Set<string>([]);

const isEnabled = (link: NavLink) => !disabledPages.has(link.href.split("#")[0]);

export const navLinks: NavLink[] = [
  { label: "Accueil", href: "/" },
  { label: "Fonctionnalités", href: "/fonctionnalites" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "À propos", href: "/a-propos" },
  { label: "Démo", href: "/demo" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
].filter(isEnabled);

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
  secondaryCta: { label: "Voir la démo", href: "/demo" },
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

/**
 * Vidéo de démonstration ouverte par « Voir la démo » (fenêtre par-dessus la page).
 * Collez le lien : YouTube (watch, youtu.be, shorts), Vimeo, ou un fichier .mp4 / .webm.
 * Tant que url est vide, le bouton mène à la page Démo (/demo), qui regroupe les vidéos.
 */
export const demoVideo = {
  url: "",
  title: "Démonstration de PrestAfrik",
};

export type DemoVideo = {
  id: string;
  /** Libellé de l'onglet. */
  label: string;
  title: string;
  /** Lien YouTube, Vimeo ou fichier .mp4 / .webm. Vide : « Vidéo bientôt disponible ». */
  url: string;
  /** Image affichée avant la lecture (sinon la miniature YouTube). */
  poster?: string;
};

/** Page Démo : une vidéo par onglet « Choisissez ce que vous voulez apprendre ». */
export const demoPage = {
  title: "Découvrez PrestAfrik en vidéo",
  subtitle:
    "Créer votre boutique, ajouter vos produits, recevoir vos commandes sur WhatsApp : regardez comment tout fonctionne, à votre rythme. Quelques minutes suffisent pour tout comprendre.",
  chooseTitle: "Choisissez ce que vous voulez apprendre",
  videos: [
    { id: "decouvrir", label: "Découvrir PrestAfrik", title: "Votre boutique, en ligne en 2 minutes", url: "https://youtu.be/mqG-gLXfd5A", poster: "/landing/demo/decouvrir-prestafrik.webp" },
    { id: "commencer", label: "Commencer sa boutique", title: "Commencer sa boutique", url: "" },
    { id: "produits", label: "Gérer ses produits", title: "Gérer ses produits", url: "" },
    { id: "whatsapp", label: "Paramétrer WhatsApp", title: "Paramétrer WhatsApp", url: "" },
  ] satisfies DemoVideo[],
};

export const partners = {
  title: "Ces boutiques vendent déjà avec PrestAfrik",
  findCta: "Voir toutes les boutiques",
  // Logos d'illustration (boutiques fictives) ; les compteurs réels sont lus en base (modules/marketplace/social-proof.ts).
  logos: [
    { src: "/landing/logos/mboa-style.svg", alt: "Mboa Style", width: 214, height: 40 },
    { src: "/landing/logos/mama-pagne.svg", alt: "Mama Pagne", width: 214, height: 40 },
    { src: "/landing/logos/linda-beauty.svg", alt: "Linda Beauty", width: 190, height: 40 },
    { src: "/landing/logos/ekane-electro.svg", alt: "Ekane Électro", width: 204, height: 40 },
    { src: "/landing/logos/kribi-accessoires.svg", alt: "Kribi Accessoires", width: 172, height: 40 },
    { src: "/landing/logos/saveurs-du-littoral.svg", alt: "Saveurs du Littoral", width: 236, height: 40 },
    { src: "/landing/logos/ndolo-kids.svg", alt: "Ndolo Kids", width: 156, height: 40 },
    { src: "/landing/logos/atelier-ndop.svg", alt: "Atelier Ndop", width: 178, height: 40 },
  ],
};

/** Comparatif de l'accueil : vendre seulement dans les discussions, ou avec une boutique PrestAfrik. */
export const comparison = {
  title: "Vendre seulement sur WhatsApp ou Facebook, ou avec PrestAfrik ?",
  lead: "Vous gardez WhatsApp : PrestAfrik le rend plus simple, plus clair et plus professionnel.",
  beforeTitle: "Seulement WhatsApp / Facebook",
  afterTitle: "Avec PrestAfrik",
  rows: [
    { before: "Vos produits se perdent dans les statuts et les discussions", after: "Un catalogue clair, avec photos, prix et stock, toujours à jour" },
    { before: "Vous répétez les prix et calculez les totaux à la main", after: "Le client voit le total exact, livraison comprise, avant de commander" },
    { before: "Les commandes se mélangent avec les messages personnels", after: "Chaque commande arrive avec le détail : vous confirmez en un message" },
    { before: "Difficile de savoir ce que vous avez vendu ce mois-ci", after: "Commandes, argent reçu et clients fidèles suivis dans un tableau de bord" },
    { before: "Un simple numéro de téléphone pour vous présenter", after: "Un lien et un QR code de boutique à partager partout" },
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
    // Captures compressées par Cloudinary (WebP 720 px de large, transparence gardée).
    { label: "Votre boutique", image: "/landing/screens/telephone-1-boutique.webp", width: 720, height: 1564 },
    { label: "Détail produit", image: "/landing/screens/telephone-2-detail.webp", width: 720, height: 1564 },
    { label: "Commande en 1 minute", image: "/landing/screens/telephone-3-commande.webp", width: 720, height: 1564 },
    { label: "Suivez vos commandes", image: "/landing/screens/telephone-4-suivi.webp", width: 720, height: 1495 },
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

const fcfa = (amount: number) => `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;

export const faq = {
  title: "Questions fréquentes",
  items: [
    {
      question: "Combien coûte PrestAfrik ?",
      // Montants lus dans config/pricing.ts : la FAQ suit toujours la page Tarifs.
      answer: `${trialLabel}. Ensuite : ${pricingPlans.map((plan) => `${plan.name} à ${fcfa(plan.monthlyXaf)} par mois (ou ${fcfa(plan.yearlyXaf)} par an)`).join(", ")}. Sans engagement. Pendant le lancement, PrestAfrik reste gratuit. Détail des offres sur la page Tarifs.`,
    },
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
        "Vous définissez vos zones de livraison et un tarif fixe pour chacune. Vos clients choisissent leur zone et voient le total exact avant de commander : pas de mauvaise surprise à la livraison. Le retrait en boutique reste possible.",
    },
    {
      question: "Quelle différence entre le lien wa.me et l’API WhatsApp ?",
      answer:
        "Avec le lien wa.me, aucun compte technique n’est nécessaire : le message est préparé et vous confirmez vous-même sur WhatsApp. Avec l’API WhatsApp, les messages partent automatiquement et leurs statuts sont suivis dans PrestAfrik.",
    },
    {
      question: "Puis-je inviter mon équipe ?",
      answer:
        "Oui. Invitez vos collaborateurs par e-mail et donnez à chacun les droits adaptés : gestionnaire (presque tout, sauf l’équipe et l’abonnement) ou préparateur de commandes (commandes et livraisons). Vous restez propriétaire et gardez la main sur tout.",
    },
  ],
};

export const finalCta = {
  kicker: "Aucun paiement requis",
  title: "Vos prochains clients vous attendent déjà !",
  subtitle: "C’est gratuit, sans engagement, et vous n’avez besoin d’aucune compétence technique.",
  primary: { label: "Créer ma boutique gratuitement", href: "/inscription" },
  secondary: { label: "Réserver une démo", href: "/contact?sujet=demo" },
};

export const footer = {
  tagline: "La boutique en ligne pensée pour vous !",
  columns: [
    { title: "Liens rapides", links: navLinks },
    {
      title: "Ressources",
      links: [
        { label: "Centre d’aide", href: "/aide" },
        { label: "Tarifs", href: "/tarifs" },
        { label: "Nos boutiques", href: "/nos-boutiques" },
        { label: "Blog", href: "/blog" },
        { label: "Démo guidée", href: "/demo" },
        { label: "Fonctionnalités", href: "/fonctionnalites" },
        { label: "Témoignages", href: "/#temoignages" },
        { label: "Créer ma boutique", href: "/inscription" },
      ].filter(isEnabled),
    },
    {
      title: "Entreprise",
      links: [
        { label: "À propos", href: "/a-propos" },
        { label: "Mentions légales", href: "/legal/mentions-legales" },
        { label: "Contact", href: "/contact" },
        { label: "Confidentialité", href: "/legal/politique-de-confidentialite" },
        { label: "Conditions générales", href: "/legal/conditions-generales" },
        { label: "Conditions de vente", href: "/legal/conditions-de-vente" },
      ].filter(isEnabled),
    },
  ],
  socialTitle: "Réseaux sociaux",
  // Seulement les comptes qui existent (lien réel) ; ouverts dans un nouvel onglet.
  socials: [
    { label: "PrestAfrik sur TikTok", href: "https://www.tiktok.com/@prestafrik1", icon: "/landing/icons/tiktok.svg" },
    { label: "PrestAfrik sur Facebook", href: "https://www.facebook.com/share/19Wt8Ra1nd/", icon: "/landing/icons/facebook.svg" },
    { label: "Chaîne WhatsApp « Club des 1000 »", href: "https://whatsapp.com/channel/0029Vb9M5ZPEwEjzoo7OsM3y", icon: "/landing/icons/whatsapp.svg" },
  ],
  copyright: "© 2026 PrestAfrik. Tous droits réservés.",
  madeBy: "Zalam",
  madeByHref: "https://zalam.fr",
};
