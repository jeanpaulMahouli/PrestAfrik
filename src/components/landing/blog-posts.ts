/**
 * Articles du blog PrestAfrik. Pour publier un article, ajoutez-le en tête de la liste :
 * le blog, la page de l'article et son adresse (/blog/{slug}) sont générés automatiquement.
 * Les exemples chiffrés sont des illustrations de calcul, pas des statistiques.
 */

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "quote"; text: string; author?: string }
  | { type: "tip"; title: string; text: string };

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  /** Date de publication (AAAA-MM-JJ). */
  date: string;
  author: string;
  cover: { src: string; width: number; height: number; kind: "screen" | "phone" };
  blocks: BlogBlock[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "transformer-whatsapp-en-machine-a-commandes",
    title: "Transformez vos discussions WhatsApp en machine à commandes",
    excerpt:
      "Vous vendez déjà sur WhatsApp ? Bonne nouvelle : vos clients sont là. Voici comment passer des messages éparpillés à un flux de commandes clair, qui vous fait gagner du temps et des ventes.",
    category: "Ventes",
    date: "2026-10-20",
    author: "L’équipe PrestAfrik",
    cover: { src: "/landing/screens/telephone-4-suivi-v2.webp", width: 720, height: 1495, kind: "phone" },
    blocks: [
      {
        type: "p",
        text: "« Bonjour, c’est combien ? » « Vous livrez à Bonamoussadi ? » « Il reste la taille M ? » Si ces messages rythment vos journées, vous avez déjà l’essentiel : des clients qui veulent acheter. Le problème n’est pas la demande, c’est tout ce qui se perd entre le premier message et la livraison.",
      },
      {
        type: "p",
        text: "Une question sans réponse pendant trois heures, un total mal calculé, une adresse oubliée dans un vocal : chaque friction coûte une vente. La bonne nouvelle, c’est qu’il suffit de quelques changements pour transformer WhatsApp en véritable machine à commandes.",
      },
      { type: "h2", text: "1. Arrêtez de répondre « c’est combien ? » toute la journée" },
      {
        type: "p",
        text: "Votre catalogue doit répondre à la place de vous. Une boutique en ligne avec photos, prix, tailles et disponibilité répond à la plupart des questions avant même qu’elles soient posées. Au lieu de renvoyer dix photos à chaque client, vous partagez un seul lien.",
      },
      {
        type: "tip",
        title: "Le réflexe gagnant",
        text: "Épinglez le lien de votre boutique dans votre profil WhatsApp Business et ajoutez-le en fin de chaque statut. Chaque vue devient une visite de votre vitrine.",
      },
      { type: "h2", text: "2. Laissez le client commander seul, à toute heure" },
      {
        type: "p",
        text: "Beaucoup de clients se décident tard le soir, quand vous dormez. S’ils doivent attendre votre réponse, une partie d’entre eux passeront à autre chose. Avec une boutique PrestAfrik, ils choisissent leurs articles, leur zone de livraison et voient le total exact : la commande est enregistrée, même à minuit.",
      },
      {
        type: "p",
        text: "Le lendemain matin, vous ouvrez votre tableau de bord : les commandes sont là, numérotées, avec le bon montant. Un geste sur « Continuer sur WhatsApp » et le message de confirmation est déjà rédigé.",
      },
      { type: "h2", text: "3. Annoncez les frais de livraison avant, jamais après" },
      {
        type: "p",
        text: "Rien ne fait fuir un client comme des frais découverts à la dernière minute. Définissez un tarif fixe par zone : Akwa, Bonapriso, Deido, toute la ville… Le client choisit son quartier et voit immédiatement ce qu’il paiera. Moins de négociation, moins d’annulations, plus de confiance.",
      },
      { type: "h2", text: "4. Gardez une trace de chaque commande" },
      {
        type: "p",
        text: "Une commande enregistrée, c’est une commande qu’on ne peut plus oublier. Nouvelle, validée ou annulée : vous savez toujours où vous en êtes. Et quand un client vous demande « où en est ma commande ? », il peut la suivre lui-même, sans créer de compte.",
      },
      {
        type: "quote",
        text: "Je partage le lien de ma boutique dans mes statuts WhatsApp et les commandes tombent toutes seules. C’est simple et professionnel.",
        author: "Grâce, vendeuse de pagnes à Kribi (témoignage illustratif)",
      },
      { type: "h2", text: "Faites le calcul" },
      {
        type: "p",
        text: "Prenons un exemple simple. Vous recevez 30 demandes par semaine sur WhatsApp et vous en concluez 10. Si une boutique claire, des prix visibles et la commande à toute heure vous permettent d’en conclure ne serait-ce que 5 de plus, c’est 50 % de ventes en plus, sans un client supplémentaire. Le levier n’est pas d’attirer plus de monde : c’est de mieux servir ceux qui sont déjà là.",
      },
      {
        type: "list",
        items: [
          "Créez votre boutique et ajoutez vos 10 meilleurs produits.",
          "Définissez vos zones de livraison avec un tarif fixe.",
          "Partagez votre lien dans vos statuts, votre profil et vos groupes.",
          "Répondez aux commandes depuis votre tableau de bord, chaque matin.",
        ],
        ordered: true,
      },
      {
        type: "p",
        text: "WhatsApp restera votre canal de discussion préféré. PrestAfrik en fait simplement un canal de vente organisé, professionnel et rentable.",
      },
    ],
  },
  {
    slug: "paiement-a-la-livraison-7-reflexes",
    title: "Paiement à la livraison : 7 réflexes pour vendre plus et annuler moins",
    excerpt:
      "Le paiement à la livraison rassure vos clients et fait décoller vos ventes, à condition de bien l’organiser. Sept réflexes simples pour limiter les annulations et les livraisons à vide.",
    category: "Livraison",
    date: "2026-10-13",
    author: "L’équipe PrestAfrik",
    cover: { src: "/landing/vendeur-livraisons.webp", width: 1280, height: 800, kind: "screen" },
    blocks: [
      {
        type: "p",
        text: "En Afrique centrale, le paiement à la livraison reste le moyen préféré pour acheter en ligne. Et pour cause : le client voit son article avant de payer. Pour vous, c’est un formidable argument de confiance. Mais mal organisé, il peut aussi coûter cher : déplacements inutiles, clients injoignables, commandes annulées sur le pas de la porte.",
      },
      { type: "p", text: "Voici sept réflexes que les boutiques les plus sereines appliquent au quotidien." },
      { type: "h2", text: "1. Affichez le total exact avant la commande" },
      {
        type: "p",
        text: "Le client doit savoir précisément ce qu’il paiera : articles et livraison compris. Un total clair, c’est un client qui a son argent prêt à la livraison, et moins de discussions devant la porte.",
      },
      { type: "h2", text: "2. Fixez vos frais par zone" },
      {
        type: "p",
        text: "Un tarif par quartier ou par ville, défini une fois pour toutes. Le client choisit sa zone, le total se met à jour automatiquement. Si vous ne livrez pas une zone, il le sait tout de suite et peut choisir le retrait en boutique.",
      },
      { type: "h2", text: "3. Confirmez chaque commande sur WhatsApp" },
      {
        type: "p",
        text: "Avant de partir en livraison, un court message de confirmation suffit : articles, total, adresse et créneau. Avec PrestAfrik, ce message est prérempli pour chaque commande. Un client qui confirme est un client qui sera là.",
      },
      {
        type: "tip",
        title: "Astuce",
        text: "Demandez un point de repère (« derrière la pharmacie du carrefour ») : c’est souvent plus utile qu’une adresse pour le livreur.",
      },
      { type: "h2", text: "4. Livrez vite, pendant que l’envie est là" },
      {
        type: "p",
        text: "Plus le délai est long, plus le risque d’annulation augmente : le client a trouvé ailleurs, a dépensé son budget ou a simplement changé d’avis. Indiquez un délai réaliste par zone et tenez-le.",
      },
      { type: "h2", text: "5. Acceptez le mobile money à la réception" },
      {
        type: "p",
        text: "Tous vos clients n’ont pas d’espèces sur eux. Proposer le paiement par mobile money au moment de la livraison évite bien des « revenez demain ».",
      },
      { type: "h2", text: "6. Validez dès que l’argent est reçu" },
      {
        type: "p",
        text: "Dans PrestAfrik, toucher « Valider » enregistre le montant dans votre argent reçu et sort les articles du stock. Votre caisse est juste, votre stock aussi, et vous voyez chaque soir ce que la journée a vraiment rapporté.",
      },
      { type: "h2", text: "7. Apprenez de vos annulations" },
      {
        type: "p",
        text: "Une annulation n’est pas une fatalité, c’est une information. Toujours la même zone ? Un délai trop long ? Un produit dont la photo ne correspond pas ? Votre historique de commandes vous aide à repérer ce qui coince et à le corriger.",
      },
      {
        type: "quote",
        text: "Mes clients commandent sans créer de compte et paient à la livraison. Ils me font confiance, et ça se voit sur mes ventes.",
        author: "Christian, gérant d’une boutique à Yaoundé (témoignage illustratif)",
      },
      {
        type: "p",
        text: "Bien organisé, le paiement à la livraison n’est pas une contrainte : c’est votre meilleur argument commercial. Il montre que vous croyez en vos produits, et vos clients le sentent.",
      },
    ],
  },
  {
    slug: "fichier-clients-faire-revenir-vos-clients",
    title: "Vos clients sont votre meilleur capital : faites-les revenir",
    excerpt:
      "Trouver un nouveau client coûte du temps et de l’énergie. Le faire revenir est bien plus simple, à condition de le connaître. Comment votre fichier clients devient votre premier levier de croissance.",
    category: "Fidélisation",
    date: "2026-10-06",
    author: "L’équipe PrestAfrik",
    cover: { src: "/landing/vendeur-clients.webp", width: 1280, height: 800, kind: "screen" },
    blocks: [
      {
        type: "p",
        text: "Chaque vendeur connaît cette sensation : on publie, on relance, on cherche sans cesse de nouveaux acheteurs. Pendant ce temps, des dizaines de clients satisfaits attendent simplement qu’on pense à eux. Ils vous connaissent, ils vous font confiance, ils ont déjà acheté. Ce sont eux, votre véritable capital.",
      },
      { type: "h2", text: "Connaître ses clients, c’est vendre mieux" },
      {
        type: "p",
        text: "Qui achète chez vous tous les mois ? Qui n’a rien commandé depuis trois mois ? Qui dépense le plus ? Sans fichier clients, impossible de répondre. Avec PrestAfrik, chaque commande enrichit automatiquement votre fichier : nom, numéro WhatsApp, historique, montant commandé et argent reçu.",
      },
      {
        type: "list",
        items: [
          "Nouveaux clients : remerciez-les et donnez-leur envie de revenir.",
          "Clients réguliers : chouchoutez-les, ce sont vos ambassadeurs.",
          "Clients inactifs : une attention suffit souvent à les réveiller.",
          "À recontacter : ne laissez plus aucune promesse sans suite.",
        ],
      },
      { type: "h2", text: "La relance qui fait plaisir, pas celle qui dérange" },
      {
        type: "p",
        text: "Personne n’aime recevoir dix messages par semaine. Mais tout le monde apprécie d’être prévenu quand son produit préféré revient en stock, ou de recevoir une offre réservée aux fidèles. La clé : envoyer le bon message, à la bonne personne, au bon moment.",
      },
      {
        type: "tip",
        title: "Le bon réflexe",
        text: "Ne relancez que les clients qui ont accepté de recevoir vos offres. PrestAfrik enregistre ce consentement pour vous : votre réputation reste intacte et vos messages sont attendus.",
      },
      { type: "h2", text: "Trois campagnes simples qui fonctionnent" },
      {
        type: "list",
        ordered: true,
        items: [
          "Le retour en stock : « Bonne nouvelle, la robe que vous aimiez est de retour en taille M. »",
          "La nouveauté réservée : « Nos clientes fidèles la découvrent avant tout le monde. »",
          "Le « vous nous manquez » : un petit geste pour les clients qui n’ont pas commandé depuis longtemps.",
        ],
      },
      { type: "h2", text: "Faites le calcul" },
      {
        type: "p",
        text: "Imaginons que vous ayez 200 clients dans votre fichier. Si une campagne bien ciblée en fait revenir seulement 1 sur 20, ce sont 10 commandes supplémentaires, sans dépenser un franc en publicité. Répétez l’opération chaque mois et la différence devient visible sur votre chiffre d’affaires.",
      },
      {
        type: "quote",
        text: "Avant, je notais tout dans un cahier. Maintenant, je sais qui sont mes meilleures clientes et je les préviens en premier de chaque arrivage.",
        author: "Awa, fondatrice d’une boutique de mode à Douala (témoignage illustratif)",
      },
      { type: "h2", text: "Passez de vendeur à marque" },
      {
        type: "p",
        text: "Les grandes enseignes ne sont pas fortes parce qu’elles vendent plus de produits, mais parce qu’elles connaissent leurs clients. Avec un fichier clients bien tenu, vous jouez dans la même catégorie : vous anticipez, vous personnalisez, vous fidélisez. C’est exactement ce qui transforme un bon vendeur en marque qu’on recommande.",
      },
    ],
  },
];

export function findBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug) ?? null;
}

/** Temps de lecture estimé (200 mots par minute). */
export function readingMinutes(post: BlogPost) {
  const words = post.blocks
    .flatMap((block) => (block.type === "list" ? block.items : block.type === "tip" ? [block.title, block.text] : [block.text]))
    .join(" ")
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
