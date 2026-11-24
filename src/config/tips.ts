// Astuces de la semaine, envoyées une par une (jamais deux fois la même) dans le centre de notifications
// des vendeurs qui ne les ont pas coupées. Ajoutez une astuce à la fin de la liste : elle sera envoyée
// après les autres. Texte court, une action concrète, et la page où la faire.

export type Tip = { title: string; body: string; url: string };

export const vendorTips: Tip[] = [
  { title: "Des photos qui font vendre", body: "Ajoutez 3 photos par produit : de face, de près et porté. Les produits bien photographiés se vendent bien mieux.", url: "/dashboard/produits" },
  { title: "Partagez votre boutique en statut", body: "Publiez le lien de votre boutique dans votre statut WhatsApp chaque semaine : c’est gratuit et vos contacts commandent en un clic.", url: "/dashboard/boutique" },
  { title: "Une promo attire l’œil", body: "Un prix promotionnel affiche un badge « −10 % » sur votre produit et le met dans la rangée Promotions.", url: "/dashboard/produits" },
  { title: "Répondez vite aux commandes", body: "Un client confirmé dans l’heure achète plus souvent. Activez les notifications pour ne rien manquer.", url: "/dashboard/commandes" },
  { title: "Vos zones de livraison", body: "Indiquez vos quartiers et vos frais : le client voit le total exact avant de commander, et il annule moins.", url: "/dashboard/livraisons" },
  { title: "Une belle couverture", body: "Ajoutez une couverture et un logo dans Ma boutique : votre vitrine inspire tout de suite confiance.", url: "/dashboard/boutique" },
  { title: "Les avis rassurent", body: "Après une livraison, invitez le client à noter son achat : les avis aident les nouveaux acheteurs à se décider.", url: "/dashboard/avis" },
  { title: "Des descriptions utiles", body: "Matière, taille, couleur, usage : une description claire répond aux questions avant qu’elles arrivent.", url: "/dashboard/produits" },
  { title: "Mettez en avant vos meilleurs produits", body: "Touchez l’étoile d’un produit pour le mettre en avant sur l’accueil de votre boutique.", url: "/dashboard/produits" },
  { title: "Fidélisez vos clients", body: "Vos clients sont enregistrés à chaque commande. Envoyez une offre à ceux qui ont accepté de la recevoir.", url: "/dashboard/marketing" },
  { title: "Un popup pour vos soldes", body: "Annoncez une offre à l’ouverture de votre boutique avec un popup : une image, une fois par visite.", url: "/dashboard/marketing/popups" },
  { title: "Suivez votre argent", body: "Validez chaque commande payée : l’argent reçu et le reste à recevoir se calculent tout seuls.", url: "/dashboard/argent" },
];
