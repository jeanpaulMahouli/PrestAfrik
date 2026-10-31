import "@/styles/guide.css";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { GuideClip, type ClipName } from "@/components/guide/guide-clip";
import { LandingButton } from "@/components/landing/buttons";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";

export const metadata: Metadata = {
  title: { absolute: "Guide du vendeur · PrestAfrik" },
  description:
    "Le guide pas à pas du tableau de bord PrestAfrik : créer sa boutique, ajouter ses produits, traiter ses commandes, recueillir des avis clients, livrer, encaisser et faire grandir sa boutique.",
  alternates: { canonical: "/aide/guide" },
};

type Lesson = {
  id: string;
  title: string;
  clip?: { name: ClipName; label: string };
  intro?: ReactNode;
  steps?: ReactNode[];
  more?: { title: string; items: ReactNode[] };
  tip?: ReactNode;
  callout?: ReactNode;
};

type Chapter = { id: string; number: number; title: string; summary: string; lessons: Lesson[] };

/** Un bouton ou un libellé tel qu'il apparaît à l'écran. */
function Ui({ children }: { children: ReactNode }) {
  return <span className="guide-ui">{children}</span>;
}

const chapters: Chapter[] = [
  {
    id: "creer-boutique",
    number: 1,
    title: "Créer votre boutique",
    summary: "Neuf étapes guidées, environ 5 minutes. Votre boutique n’est créée qu’à la dernière étape : rien n’est publié tant que vous n’avez pas validé.",
    lessons: [
      {
        id: "avant-de-commencer",
        title: "Avant de commencer",
        steps: [
          <>Créez votre compte sur <Link href="/inscription">la page d’inscription</Link> (adresse e-mail ou Google), puis confirmez votre adresse e-mail avec le lien reçu.</>,
          <>Indiquez votre numéro WhatsApp : c’est sur ce numéro que vos clients vous écriront.</>,
          <>Touchez <Ui>Créer ma boutique maintenant</Ui>. Un assistant en 9 étapes s’ouvre ; la barre orange en haut indique où vous en êtes.</>,
        ],
        tip: <>Sous chaque étape, l’<strong>aperçu de votre boutique, en direct</strong> montre ce que vos clients verront : le nom, la description, le thème et les couleurs s’y affichent au fur et à mesure que vous tapez.</>,
      },
      {
        id: "etapes-nom-activite",
        title: "Étapes 1 et 2 : le nom et l’activité",
        clip: { name: "creer-boutique-1", label: "Étapes 1 et 2 : nom de la boutique, activité et description" },
        steps: [
          <><strong>Nom.</strong> Tapez le nom de votre boutique (60 caractères au plus). L’adresse web se remplit toute seule (par exemple <em>mama-ngo-couture</em>) et PrestAfrik vérifie qu’elle est libre. Si elle est prise, choisissez l’une des adresses proposées.</>,
          <>Touchez <Ui>Continuer</Ui>.</>,
          <><strong>Activité.</strong> Touchez l’une des <em>activités les plus choisies</em> (Vêtements et mode, Beauté et cosmétiques…) ou ouvrez la liste <Ui>Votre activité principale</Ui> et tapez pour chercher. Votre activité n’y est pas ? Choisissez « Mon activité n’est pas dans la liste » et écrivez-la.</>,
          <><strong>Description (facultative).</strong> En une ou deux phrases : ce que vous vendez et ce qui vous rend unique. Elle s’affiche en haut de votre boutique.</>,
          <>Touchez <Ui>Continuer</Ui>.</>,
        ],
      },
      {
        id: "etapes-lieu-contact",
        title: "Étapes 3 et 4 : la localisation et les coordonnées",
        clip: { name: "creer-boutique-2", label: "Étapes 3 et 4 : région, ville, quartier puis téléphone de la boutique" },
        steps: [
          <><strong>Localisation.</strong> Le pays est déjà choisi. Touchez <Ui>Région</Ui> puis <Ui>Ville</Ui> : les listes se filtrent quand vous tapez. Le quartier est facultatif (ex. Akwa).</>,
          <><strong>Coordonnées.</strong> Saisissez le <Ui>Téléphone de la boutique</Ui> sans l’indicatif : le format international (+237…) est ajouté automatiquement. Une coche verte confirme que le numéro est valide.</>,
          <>La case <Ui>Mon numéro WhatsApp est le même que mon téléphone</Ui> est cochée par défaut. Décochez-la si vos clients doivent vous écrire sur un autre numéro.</>,
          <>L’e-mail de contact est facultatif : il s’affiche dans la page Contact de votre boutique.</>,
        ],
      },
      {
        id: "etapes-theme-couleurs",
        title: "Étapes 5 et 6 : le thème, les couleurs et le logo",
        clip: { name: "creer-boutique-3", label: "Étapes 5 et 6 : choix du thème, puis couleurs et logo" },
        steps: [
          <><strong>Thème.</strong> Quatre styles : <em>Catalogue express</em> (simple et rapide, idéal pour beaucoup de produits), <em>Mode et beauté</em> (photos en grand), <em>Galerie</em> et <em>Grand marché</em>. Touchez-en un : l’aperçu change immédiatement. Vous pourrez en changer plus tard sans perdre vos produits.</>,
          <><strong>Couleurs et logo.</strong> Ajoutez votre logo (PNG, JPG ou WebP) ou gardez vos initiales. Choisissez la couleur principale, secondaire et d’accent ; PrestAfrik vérifie que le texte reste lisible.</>,
          <>Touchez <Ui>Continuer</Ui> à chaque étape. <Ui>Passer cette étape</Ui> garde les réglages par défaut.</>,
        ],
      },
      {
        id: "etapes-produit-livraison-publication",
        title: "Étapes 7 à 9 : le premier produit, la livraison et la publication",
        clip: { name: "creer-boutique-4", label: "Étapes 7 à 9 : premier produit avec photo, livraison et retrait, puis publication" },
        steps: [
          <><strong>Premier produit (facultatif).</strong> Nom, prix en FCFA (un nombre entier, sans espace) et jusqu’à 5 photos. La première photo est la photo principale.</>,
          <><strong>Livraison et retrait (facultatif).</strong> Ajoutez vos zones (quartier, frais, délai) avec <Ui>+ Ajouter une zone</Ui>, et/ou cochez le retrait en boutique avec votre adresse et vos horaires.</>,
          <><strong>Publication.</strong> Un récapitulatif reprend tout ; <Ui>Modifier</Ui> vous ramène à l’étape concernée. Touchez <Ui>Créer et publier ma boutique</Ui>.</>,
          <>PrestAfrik vous propose ensuite d’<strong>installer l’application</strong> sur votre écran d’accueil : vos commandes en un geste. Vous pouvez aussi toucher <Ui>Plus tard</Ui>.</>,
        ],
        tip: <>Besoin de faire une pause ? Touchez <Ui>Enregistrer et quitter</Ui> en haut : vous reprendrez votre brouillon exactement là où vous vous êtes arrêté.</>,
      },
    ],
  },
  {
    id: "tableau-de-bord",
    number: 2,
    title: "Votre tableau de bord",
    summary: "L’accueil de votre espace vendeur : l’essentiel de votre boutique en un coup d’œil, et le menu vers toutes les fonctions.",
    lessons: [
      {
        id: "accueil",
        title: "L’accueil : vos chiffres clés",
        clip: { name: "tableau-de-bord", label: "Accueil : changement de période, graphiques, produits les mieux notés et dernières commandes" },
        steps: [
          <>Choisissez la période en haut : <Ui>7 jours</Ui>, <Ui>30 jours</Ui> ou <Ui>3 mois</Ui>. Tous les chiffres se mettent à jour.</>,
          <><strong>Chiffres clés</strong> : nombre de commandes, argent encaissé, visites de la boutique et panier moyen. Touchez le petit <Ui>i</Ui> pour l’explication de chaque chiffre.</>,
          <><strong>Graphiques</strong> : commandes et argent encaissé par jour (ou par semaine sur 3 mois). <Ui>Voir les chiffres en tableau</Ui> affiche les valeurs exactes.</>,
          <><strong>Produits les mieux notés</strong> : vos produits classés selon les avis de vos clients.</>,
          <><strong>Dernières commandes</strong> : les 5 plus récentes avec leur état ; <Ui>Toutes les commandes</Ui> ouvre la liste complète.</>,
          <><strong>Pour bien démarrer</strong> : la liste des étapes restantes (informations, produits, livraison, contact, publication). Chaque ligne mène au bon écran.</>,
        ],
        more: {
          title: "En haut de l’écran",
          items: [
            <><Ui>Loupe</Ui> : cherchez une commande, un produit ou un client.</>,
            <><Ui>Boutique</Ui> : ouvre votre boutique, telle que vos clients la voient.</>,
            <>Les <Ui>initiales de la boutique</Ui> : passez d’une boutique à l’autre si vous en gérez plusieurs.</>,
            <>Votre <Ui>avatar</Ui> : votre profil, l’installation de l’application et la déconnexion.</>,
            <>La bulle orange en bas à droite : écrivez à l’équipe PrestAfrik.</>,
          ],
        },
      },
      {
        id: "menu",
        title: "Le menu : toutes les rubriques",
        clip: { name: "menu", label: "Ouverture du menu et passage à la rubrique Produits" },
        steps: [
          <>Sur téléphone, touchez les <Ui>trois traits</Ui> en haut à gauche. Sur ordinateur, le menu est toujours affiché à gauche.</>,
          <>Rubriques : Accueil, Commandes, Livraisons, Produits, Avis clients, Clients, Argent reçu, Marketing, Équipe, Ma boutique et Abonnement (gratuit pendant le lancement).</>,
          <>Touchez une rubrique : le menu se ferme et la page s’ouvre.</>,
        ],
        tip: <>Les membres de votre équipe ne voient que les rubriques autorisées par leur rôle (voir « Votre équipe »).</>,
      },
      {
        id: "partager",
        title: "Partager votre boutique",
        clip: { name: "partager", label: "Le bouton Partager du tableau de bord" },
        steps: [
          <>Touchez <Ui>Partager</Ui> en haut de l’accueil.</>,
          <>Copiez le lien de votre boutique, téléchargez son QR code (à imprimer sur vos sacs, cartes ou vitrine) ou envoyez-le directement sur WhatsApp et les réseaux sociaux.</>,
        ],
        tip: <>Mettez le lien dans votre statut WhatsApp et dans la bio de vos réseaux : chaque visite est comptée dans « Visites de la boutique ».</>,
      },
    ],
  },
  {
    id: "produits",
    number: 3,
    title: "Vos produits",
    summary: "Ajoutez, modifiez, mettez en avant ou retirez vos produits : chaque changement apparaît tout de suite dans votre boutique.",
    lessons: [
      {
        id: "ajouter-produit",
        title: "Ajouter un produit",
        clip: { name: "ajouter-produit", label: "Ajout d’un produit : nom, description, catégorie, photo, prix et enregistrement" },
        steps: [
          <>Dans <Ui>Produits</Ui>, touchez <Ui>+ Ajouter un produit</Ui>.</>,
          <><strong>Nom du produit</strong> (obligatoire) puis <strong>description</strong> : gras, italique, sous-titres et listes avec la barre d’outils ; <Ui>Aperçu</Ui> montre le rendu.</>,
          <><strong>Catégorie</strong> : choisissez-en une, ou <Ui>+ Créer une catégorie…</Ui> en bas de la liste. Les catégories deviennent les onglets de votre boutique.</>,
          <><strong>Photos</strong> : jusqu’à 5 (JPG, PNG ou WebP, 5 Mo au plus). La première est la photo principale ; faites glisser les photos (ou utilisez les flèches) pour changer l’ordre.</>,
          <><strong>Prix</strong> en FCFA, et un <strong>prix promotionnel</strong> facultatif, inférieur au prix : le pourcentage de réduction s’affiche automatiquement et le produit rejoint la rangée « Promotions ».</>,
          <>Touchez <Ui>Enregistrer le produit</Ui> : il apparaît dans la liste avec le message « Produit ajouté ».</>,
        ],
        more: {
          title: "Plus bas dans le formulaire",
          items: [
            <><strong>Variantes</strong> : tailles, couleurs… chacune avec sa référence, son prix et son stock (sans prix, celui du produit s’applique).</>,
            <><strong>Disponibilité</strong> : Disponible, Épuisé ou Sur commande.</>,
            <><strong>Stock</strong> : cochez <Ui>Suivre le stock</Ui> pour que la quantité baisse à chaque commande.</>,
            <><strong>Publication</strong> : Actif (visible) ou Brouillon (caché), et <Ui>Mettre en avant dans la boutique</Ui>.</>,
          ],
        },
        tip: <>Photographiez à la lumière du jour, de face puis de près, sur un fond simple : un produit bien photographié se vend mieux.</>,
      },
      {
        id: "gerer-produits",
        title: "Gérer vos produits",
        clip: { name: "gerer-produits", label: "Mise en avant d’un produit, menu d’actions, puis modification" },
        steps: [
          <><strong>Onglets</strong> : <Ui>Actifs</Ui> (en vente), <Ui>Brouillons</Ui> (cachés) et <Ui>Archivés</Ui>.</>,
          <><strong>Recherche et filtres</strong> : par nom ou référence, catégorie et disponibilité, puis <Ui>Filtrer</Ui>.</>,
          <><strong>Étoile</strong> : met le produit en avant sur l’accueil de votre boutique (« Nos produits mis en avant »). Touchez-la à nouveau pour l’enlever.</>,
          <><strong>Bouton « ⋯ »</strong> : <Ui>Modifier</Ui>, <Ui>Dupliquer</Ui> (pratique pour un produit proche), <Ui>Voir dans la boutique</Ui>, <Ui>Archiver</Ui> et <Ui>Supprimer</Ui>.</>,
          <>La page de modification reprend le même formulaire ; touchez <Ui>Enregistrer</Ui> en bas.</>,
        ],
        more: {
          title: "Beaucoup de produits ?",
          items: [
            <><strong>Importer</strong> (flèche vers le haut) : ajoutez des dizaines de produits d’un coup avec un fichier CSV ; chaque ligne est vérifiée avant l’import.</>,
            <><strong>Exporter</strong> (flèche vers le bas) : téléchargez votre catalogue en CSV.</>,
            <><strong>Sélection multiple</strong> : cochez plusieurs produits pour les supprimer ensemble.</>,
          ],
        },
        tip: <>Un produit déjà commandé ne peut pas être supprimé : archivez-le. Il disparaît de la boutique mais vos commandes restent intactes.</>,
      },
    ],
  },
  {
    id: "commandes",
    number: 4,
    title: "Vos commandes",
    summary: "Vos clients commandent sans créer de compte. Vous échangez avec eux sur WhatsApp, puis vous validez la commande une fois payée.",
    lessons: [
      {
        id: "traiter-commande",
        title: "Traiter une commande, de A à Z",
        clip: { name: "commandes", label: "Onglet Nouvelles, bouton WhatsApp, détail d’une commande puis validation" },
        steps: [
          <><strong>Vous êtes prévenu</strong> : la commande apparaît dans <Ui>Commandes</Ui> avec le badge <em>Nouvelle</em>, et vous recevez un e-mail.</>,
          <>Les onglets <Ui>Toutes</Ui>, <Ui>Nouvelles</Ui> et <Ui>Validées</Ui> trient vos commandes ; le nombre de chaque onglet s’affiche à côté.</>,
          <>Touchez <Ui>Continuer sur WhatsApp</Ui> : la conversation s’ouvre avec un message déjà rédigé (référence, articles, total). Confirmez la livraison et le paiement avec votre client.</>,
          <>Touchez la <strong>référence</strong> (ex. #MB-1001) ou <Ui>Voir</Ui> pour le détail : articles, frais de livraison, total, adresse et téléphone du client.</>,
          <>Une fois l’argent reçu, touchez <Ui>Valider</Ui>. La commande passe en <em>Validée</em> et son montant est compté dans <Ui>Argent reçu</Ui>.</>,
        ],
        more: {
          title: "Bon à savoir",
          items: [
            <><Ui>Annuler la commande</Ui> (sur la page de la commande) : les articles reviennent en stock ; si elle était validée, son montant est retiré de l’argent reçu.</>,
            <>L’icône de téléchargement en haut exporte vos commandes en CSV (Excel, Google Sheets).</>,
            <>Votre client suit sa commande depuis le lien reçu : il voit quand elle est validée.</>,
          ],
        },
      },
    ],
  },
  {
    id: "avis",
    number: 5,
    title: "Les avis clients",
    summary: "Les avis aident à valoriser vos produits : des étoiles et des témoignages réels rassurent les nouveaux acheteurs et les décident à commander.",
    lessons: [
      {
        id: "pourquoi-avis",
        title: "Pourquoi les avis comptent",
        callout: (
          <>
            <strong>Les avis aident à valoriser votre produit.</strong> Un visiteur qui ne vous connaît pas encore fait confiance à ceux qui ont déjà acheté. Les étoiles s’affichent sur vos fiches produit et dans votre catalogue, votre note moyenne apparaît sur chaque produit, et vos produits les mieux notés sont mis en valeur sur votre tableau de bord. Plus vous avez d’avis, plus vos produits inspirent confiance.
          </>
        ),
        steps: [
          <><strong>Publiés aussitôt</strong> : l’avis d’un client est visible dès qu’il le dépose, sans validation.</>,
          <><strong>Jamais retirés</strong> : ni vous ni votre équipe ne pouvez retirer ou supprimer un avis. C’est ce qui rend vos avis crédibles : vos clients savent qu’ils lisent de vrais témoignages.</>,
          <><strong>Sans compte</strong> : le client donne une note de 1 à 5 étoiles, son prénom et quelques mots (10 caractères au moins).</>,
        ],
      },
      {
        id: "client-laisse-avis",
        title: "Côté client : laisser un avis",
        clip: { name: "avis-client", label: "Un client ouvre un produit, donne 5 étoiles et publie son avis" },
        steps: [
          <>Sur la fiche d’un produit, le client descend jusqu’à <Ui>Avis clients</Ui> et touche <Ui>Donner mon avis</Ui>.</>,
          <>Il choisit sa note (de « Décevant » à « Excellent »), écrit son prénom et son avis.</>,
          <>Il touche <Ui>Publier mon avis</Ui> : « Merci ! Votre avis est publié. » La note moyenne du produit se met à jour immédiatement.</>,
        ],
        tip: <>Après chaque livraison, envoyez sur WhatsApp le lien du produit à votre client en l’invitant à laisser un avis. Quelques avis suffisent à faire la différence.</>,
      },
      {
        id: "vendeur-suit-avis",
        title: "Côté vendeur : suivre vos avis",
        clip: { name: "avis-vendeur", label: "La rubrique Avis clients du tableau de bord" },
        steps: [
          <>Ouvrez <Ui>Avis clients</Ui> dans le menu : votre note moyenne et le nombre d’avis publiés s’affichent en haut.</>,
          <>Chaque avis indique le client, la date, la note et le produit concerné (touchez-le pour ouvrir la fiche).</>,
          <>Lisez-les régulièrement : ils vous disent ce que vos clients aiment et ce que vous pouvez améliorer (photos, tailles, délais…).</>,
        ],
        more: {
          title: "Activer ou désactiver les avis",
          items: [
            <><Ui>Désactiver les avis</Ui> masque toutes les étoiles et tous les avis de votre boutique et empêche d’en laisser de nouveaux. Les avis existants sont conservés et réapparaissent si vous les réactivez.</>,
            <>Nous vous conseillons de les laisser activés : une boutique sans avis rassure moins.</>,
          ],
        },
      },
    ],
  },
  {
    id: "livraisons",
    number: 6,
    title: "Livraisons et retrait",
    summary: "Indiquez où vous livrez et à quel prix : vos clients voient les frais avant de commander, et le total est toujours juste.",
    lessons: [
      {
        id: "zones",
        title: "Ajouter une zone de livraison",
        clip: { name: "livraisons", label: "Ajout de la zone Bonamoussadi à 1 500 FCFA, livrée en 24 h" },
        steps: [
          <>Dans <Ui>Livraisons</Ui>, touchez <Ui>+ Ajouter une zone</Ui>.</>,
          <>Écrivez le <strong>quartier ou la zone</strong> (ex. Akwa, ou « Toute la ville »), choisissez la <strong>ville</strong>, puis les <strong>frais</strong> en FCFA (0 = livraison gratuite) et le <strong>délai</strong> (facultatif, ex. 24 h).</>,
          <>Touchez <Ui>Ajouter la zone</Ui> : elle est aussitôt proposée à vos clients.</>,
          <><Ui>Modifier</Ui> sous une zone permet de changer ses frais ou de la désactiver temporairement.</>,
        ],
        tip: <>Le retrait en boutique (gratuit) se règle dans <Ui>Ma boutique</Ui> : adresse et horaires de retrait.</>,
      },
    ],
  },
  {
    id: "clients",
    number: 7,
    title: "Vos clients",
    summary: "Votre fichier clients se remplit tout seul à chaque commande : historique, segments et consentements.",
    lessons: [
      {
        id: "fichier-clients",
        title: "Le fichier clients",
        clip: { name: "clients", label: "Segments de clients et fiche d’un client" },
        steps: [
          <>Ouvrez <Ui>Clients</Ui> : chaque personne qui a commandé y figure, avec ses commandes et le total dépensé.</>,
          <>Les <strong>segments</strong> (Nouveau client, Client régulier, À recontacter, Inactif…) vous aident à savoir qui relancer.</>,
          <>Touchez un client pour ouvrir sa <strong>fiche</strong> : commandes, échanges, notes et rappels.</>,
          <><Ui>Ajouter un client</Ui> : pour un client rencontré hors de la boutique (une fiche ajoutée à la main n’autorise aucun envoi de message).</>,
          <>L’icône de téléchargement exporte votre fichier en CSV.</>,
        ],
      },
    ],
  },
  {
    id: "argent",
    number: 8,
    title: "L’argent reçu",
    summary: "Chaque commande validée est comptée ici automatiquement : vous savez toujours combien vous avez encaissé.",
    lessons: [
      {
        id: "suivre-argent",
        title: "Suivre vos encaissements",
        clip: { name: "argent", label: "Changement de période dans Argent reçu" },
        steps: [
          <>Touchez la période (<Ui>7 derniers jours ▾</Ui>) : Aujourd’hui, 7 derniers jours, Mois en cours, ou une <strong>période personnalisée</strong> (du… au…, puis <Ui>Appliquer</Ui>).</>,
          <>En haut : l’<strong>argent reçu</strong> et le nombre de <strong>commandes validées</strong> sur la période.</>,
          <>En dessous, chaque encaissement : date, référence, client et montant. Une commande annulée après validation apparaît en rouge, en négatif.</>,
        ],
      },
    ],
  },
  {
    id: "ma-boutique",
    number: 9,
    title: "Ma boutique",
    summary: "L’apparence, les informations pratiques, les pages et les messages WhatsApp de votre boutique.",
    lessons: [
      {
        id: "apparence",
        title: "Apparence et informations",
        clip: { name: "ma-boutique", label: "Aperçu avant publication, puis changement du style des promotions" },
        steps: [
          <><strong>Logo</strong> : glissez votre image (PNG, JPG ou WebP, 2 Mo au plus), recadrée en carré. Sans logo, vos initiales s’affichent.</>,
          <><strong>Apparence</strong> : thème (Catalogue express, Mode et beauté, Galerie, Grand marché) et <strong>style des promotions</strong> (Classique, Vente flash, Offres du jour, Éclat).</>,
          <><strong>Couleurs</strong> : principale, secondaire et d’accent ; le badge « Lisible » confirme le contraste.</>,
          <><strong>Informations</strong> : nom, activité, ville, quartier, téléphone, e-mail, adresse, description et retrait en boutique.</>,
          <><strong>Aperçu avant publication</strong> : votre vraie boutique dans un téléphone, mise à jour avant même l’enregistrement. Touchez <Ui>Enregistrer les modifications</Ui> pour publier.</>,
        ],
        more: {
          title: "Les autres onglets de Ma boutique",
          items: [
            <><Ui>Pages</Ui> : créez vos pages À propos, Contact ou FAQ avec des blocs simples.</>,
            <><Ui>Messages</Ui> : votre numéro WhatsApp et les messages prêts à envoyer (à vos clients et pour vous).</>,
            <><strong>Assistant WhatsApp</strong> : un message d’accueil et des réponses rapides affichés sur votre boutique, avant de passer la conversation sur WhatsApp.</>,
            <><strong>Zone sensible</strong> : <Ui>Mettre en brouillon</Ui> cache votre boutique sans rien perdre ; <Ui>Supprimer ma boutique…</Ui> est définitif.</>,
          ],
        },
      },
    ],
  },
  {
    id: "marketing",
    number: 10,
    title: "Marketing",
    summary: "Faites revenir vos clients et mettez vos offres en avant avec trois outils.",
    lessons: [
      {
        id: "outils-marketing",
        title: "Bannière, popup et campagnes",
        clip: { name: "marketing", label: "Les outils Bannière et Campagnes" },
        steps: [
          <><strong>Bannière</strong> : jusqu’à 4 images (nouveautés, promotions) qui défilent sous la recherche de votre boutique, toutes les 5 secondes.</>,
          <><strong>Popups</strong> : une image qui s’affiche à l’ouverture de votre boutique, une fois par visite. Activez-la ou désactivez-la quand vous voulez.</>,
          <><strong>Campagnes</strong> : préparez des messages ciblés, envoyés uniquement aux clients qui ont accepté de recevoir vos offres.</>,
        ],
      },
    ],
  },
  {
    id: "equipe",
    number: 11,
    title: "Votre équipe",
    summary: "Invitez les personnes qui vous aident et donnez à chacune le bon niveau d’accès.",
    lessons: [
      {
        id: "inviter",
        title: "Inviter un membre",
        clip: { name: "equipe", label: "Invitation d’une personne et liste des membres" },
        steps: [
          <>Dans <Ui>Équipe</Ui>, partie <Ui>Inviter une personne</Ui> : saisissez son adresse e-mail et choisissez son rôle.</>,
          <><strong>Gestionnaire</strong> : produits, commandes, clients, livraisons et argent reçu. <strong>Préparateur de commandes</strong> : voit les commandes et les produits et écrit aux clients sur WhatsApp.</>,
          <>La personne reçoit un lien d’invitation ; tant qu’il n’est pas accepté, il apparaît dans <Ui>Invitations en attente</Ui>.</>,
          <>Dans <Ui>Membres</Ui>, changez le rôle d’une personne ou retirez-la de l’équipe.</>,
        ],
        tip: <>Seul le propriétaire peut tout gérer, y compris l’équipe et la boutique. Le rôle Propriétaire ne peut pas être donné par invitation.</>,
      },
    ],
  },
];

export default async function GuidePage() {
  const signedIn = await isSignedIn();
  return (
    <PageShell
      className="lp-page--guide"
      hero={{
        kicker: "Guide du vendeur",
        title: "Bien utiliser PrestAfrik, pas à pas",
        subtitle: "De la création de votre boutique à vos premiers avis clients : chaque fonction du tableau de bord expliquée, avec la vraie interface filmée sur téléphone.",
      }}
      signedIn={signedIn}
    >
      <div className="guide">
        <nav aria-label="Sommaire du guide" className="guide-toc">
          <p className="guide-toc-title">Sommaire</p>
          <ol>
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <a href={`#${chapter.id}`}>
                  <span aria-hidden="true">{chapter.number}</span>
                  {chapter.title}
                </a>
              </li>
            ))}
          </ol>
          <p className="guide-toc-note">Les animations montrent la vraie interface ; touchez « Revoir » pour relancer une animation depuis le début.</p>
        </nav>

        <div className="guide-content">
          {chapters.map((chapter) => (
            <section aria-labelledby={`${chapter.id}-title`} className="guide-chapter" id={chapter.id} key={chapter.id}>
              <header className="guide-chapter-head">
                <span aria-hidden="true" className="guide-chapter-number">{chapter.number}</span>
                <div>
                  <h2 id={`${chapter.id}-title`}>{chapter.title}</h2>
                  <p>{chapter.summary}</p>
                </div>
              </header>

              {chapter.lessons.map((lesson) => (
                <article aria-labelledby={`${lesson.id}-title`} className={`guide-lesson${lesson.clip ? " has-clip" : ""}`} id={lesson.id} key={lesson.id}>
                  <div className="guide-lesson-text">
                    <h3 id={`${lesson.id}-title`}>{lesson.title}</h3>
                    {lesson.callout && <p className="guide-callout">{lesson.callout}</p>}
                    {lesson.intro && <p>{lesson.intro}</p>}
                    {lesson.steps && (
                      <ol className="guide-steps">
                        {lesson.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    )}
                    {lesson.more && (
                      <div className="guide-more">
                        <h4>{lesson.more.title}</h4>
                        <ul>
                          {lesson.more.items.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {lesson.tip && (
                      <p className="guide-tip">
                        <strong>Astuce</strong> {lesson.tip}
                      </p>
                    )}
                  </div>
                  {lesson.clip && (
                    <div className="guide-lesson-media">
                      <GuideClip label={lesson.clip.label} name={lesson.clip.name} />
                    </div>
                  )}
                </article>
              ))}
            </section>
          ))}

          <section className="guide-end">
            <h2>Une question qui n’est pas ici ?</h2>
            <p>
              Consultez le <Link href="/aide">centre d’aide</Link> ou écrivez-nous depuis la bulle orange de votre tableau de bord : un membre de l’équipe vous répond.
            </p>
            <LandingButton href={signedIn ? "/dashboard" : "/inscription"}>{signedIn ? "Ouvrir mon tableau de bord" : "Créer ma boutique"}</LandingButton>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
