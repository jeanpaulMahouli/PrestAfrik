import { BadgeCheck, Bot, FileSpreadsheet, HandCoins, LayoutTemplate, Megaphone, MessageCircle, Palette, QrCode, ShieldCheck, Smartphone, Store, Truck, Users, Wallet, Zap } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Compare, FeatureGrid, SectionHead, SplitFeature } from "@/components/landing/blocks";
import { LandingButton } from "@/components/landing/buttons";
import { disabledPages } from "@/components/landing/content";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";

export const metadata: Metadata = {
  title: { absolute: "Fonctionnalités · PrestAfrik" },
  description:
    "Boutique en ligne, commandes WhatsApp, paiement à la livraison, fichier clients, campagnes et équipe : tout ce qu’il faut pour vendre en ligne au Cameroun, dans un seul espace.",
};

const essentials = [
  { icon: Store, title: "Votre boutique en 5 minutes", text: "Un assistant vous guide en 8 étapes : nom, activité, ville, couleurs, premier produit. Votre adresse prestafrik.com/votre-boutique est prête à partager." },
  { icon: MessageCircle, title: "Commandes sur WhatsApp", text: "Chaque commande arrive avec le bon montant et un message prêt à envoyer. Un geste pour continuer la discussion avec votre client." },
  { icon: HandCoins, title: "Paiement à la livraison", text: "Vos clients paient en espèces ou par mobile money à la réception. Aucun paiement en ligne à configurer, aucune commission sur vos ventes." },
  { icon: Truck, title: "Livraison par zones", text: "Un tarif fixe par quartier ou par ville. Le client voit le total exact avant de commander : fini les négociations sur les frais." },
  { icon: Users, title: "Fichier clients automatique", text: "Chaque commande enrichit votre fichier : historique, montant commandé, segments « réguliers », « inactifs » ou « à recontacter »." },
  { icon: Wallet, title: "Argent reçu, au franc près", text: "Chaque commande validée est comptée automatiquement. Vous savez chaque soir ce que vous avez encaissé, jour après jour." },
];

const more = [
  { icon: Megaphone, title: "Campagnes WhatsApp", text: "Relancez vos clients qui ont accepté de recevoir vos offres, par segment, avec un historique des envois." },
  { icon: Palette, title: "3 thèmes, vos couleurs", text: "Catalogue express, Mode et beauté ou Boutique de marque : votre logo, vos couleurs, avec un contrôle de lisibilité." },
  { icon: LayoutTemplate, title: "Pages de votre boutique", text: "À propos, contact, FAQ ou promotion : composez vos pages en blocs, sans compétence technique." },
  { icon: Bot, title: "Assistant de discussion", text: "Des réponses guidées aux questions fréquentes de vos clients, puis un passage fluide vers votre WhatsApp." },
  { icon: QrCode, title: "QR code et partage", text: "Un QR code à imprimer, un lien à copier, un partage WhatsApp en un geste : votre boutique voyage partout." },
  { icon: FileSpreadsheet, title: "Import et export CSV", text: "Importez tout votre catalogue d’un coup, exportez vos commandes et vos clients quand vous le souhaitez." },
  { icon: Smartphone, title: "Pensé pour le téléphone", text: "Votre espace et votre boutique s’utilisent aussi bien sur un petit téléphone que sur un ordinateur." },
  { icon: ShieldCheck, title: "Données protégées", text: "Numéros masqués dans les listes, accès par rôle, sessions sécurisées : la confiance de vos clients est préservée." },
];

const compare = [
  { before: "Les commandes se perdent entre les messages et les vocaux.", after: "Chaque commande est enregistrée, avec un numéro et un statut." },
  { before: "Vous recalculez les totaux et les frais de livraison à la main.", after: "Le total exact, livraison comprise, est affiché avant la commande." },
  { before: "Les photos du catalogue sont dispersées dans vos statuts.", after: "Un catalogue clair, avec recherche, catégories et fiches produit." },
  { before: "Impossible de savoir combien vous avez vraiment encaissé.", after: "L’argent reçu est compté automatiquement, chaque jour." },
  { before: "Vos clients fidèles sont noyés dans vos contacts.", after: "Un fichier clients trié, prêt pour vos relances." },
];

export default async function FeaturesPage() {
  // Page en attente de sa maquette (voir disabledPages dans content.ts).
  if (disabledPages.has("/fonctionnalites")) notFound();
  const signedIn = await isSignedIn();
  return (
    <PageShell
      hero={{
        title: "Tout pour vendre en ligne, rien de superflu",
        subtitle: "Une boutique professionnelle, des commandes claires et un tableau de bord qui vous dit l’essentiel. Pensé pour les commerçants africains, utilisable sans formation.",
        actions: (
          <>
            <LandingButton href="/demo" variant="secondary">
              Voir la démo
            </LandingButton>
            <LandingButton href={signedIn ? "/dashboard" : "/inscription"}>{signedIn ? "Aller à mon espace" : "Créer ma boutique gratuitement"}</LandingButton>
          </>
        ),
      }}
      signedIn={signedIn}
    >
      <section aria-labelledby="essentiels-title" className="lp-section">
        <span aria-hidden="true" className="lp-glow lp-glow--left" />
        <SectionHead id="essentiels-title" lead="Les six piliers qui transforment vos ventes WhatsApp en un vrai commerce en ligne." title="Ce qui change dès le premier jour" />
        <FeatureGrid items={essentials} />
      </section>

      <section aria-labelledby="details-title" className="lp-section">
        <SectionHead id="details-title" title="Un espace vendeur clair, écran par écran" />
        <div className="lp-split-list">
          <SplitFeature
            image={{ src: "/landing/vendeur-commandes.webp", width: 1280, height: 800, alt: "Liste des commandes avec les boutons Continuer sur WhatsApp, Valider et Voir", kind: "screen" }}
           
            points={["Trois statuts seulement : nouvelle, validée, annulée", "Message WhatsApp prérempli pour chaque client", "Valider compte l’argent reçu et sort le stock"]}
            text="Chaque commande arrive avec ses articles, son total et l’adresse de livraison. Vous écrivez au client, vous validez quand c’est payé : c’est tout."
            title="Trois boutons, pas plus"
          />
          <SplitFeature
            image={{ src: "/landing/screens/telephone-3-commande.webp", width: 1068, height: 2217, alt: "Formulaire de commande sur téléphone", kind: "phone" }}
           
            points={["Aucun compte, aucune application", "Zone de livraison et total affichés avant de valider", "Commande ou passage direct sur WhatsApp"]}
            reverse
            text="Vos clients commandent en une minute avec leur nom, leur numéro WhatsApp et leur quartier. Ils savent exactement ce qu’ils paieront à la livraison."
            title="Commander devient un jeu d’enfant"
          />
          <SplitFeature
            image={{ src: "/landing/vendeur-clients.webp", width: 1280, height: 800, alt: "Fichier clients avec segments et consentements", kind: "screen" }}
           
            points={["Segments automatiques : nouveaux, réguliers, inactifs", "Notes et rappels pour ne plus oublier personne", "Consentement marketing enregistré et respecté"]}
            text="Votre fichier clients se remplit tout seul. Repérez vos meilleurs acheteurs, relancez ceux qui ne sont pas revenus et construisez une vraie relation."
            title="Vos clients, enfin organisés"
          />
          <SplitFeature
            image={{ src: "/landing/vendeur-livraisons.webp", width: 1280, height: 800, alt: "Zones de livraison et leurs frais", kind: "screen" }}
           
            points={["Un tarif fixe par zone", "Délais indiqués au client", "Retrait en boutique en option"]}
            reverse
            text="Définissez une fois vos zones et vos tarifs. Le client choisit sa zone, le total se met à jour : plus aucun échange pour fixer les frais."
            title="Des frais de livraison connus d’avance"
          />
          <SplitFeature
            image={{ src: "/landing/vendeur-argent.webp", width: 1280, height: 800, alt: "Argent reçu par jour", kind: "screen" }}
           
            points={["Comptage automatique à la validation", "Annulation déduite automatiquement", "Filtre par période"]}
            text="Chaque commande validée s’ajoute à votre argent reçu. Une annulation est déduite automatiquement : vos chiffres sont toujours justes."
            title="Votre caisse, toujours à jour"
          />
        </div>
      </section>

      <section aria-labelledby="plus-title" className="lp-section">
        <span aria-hidden="true" className="lp-glow lp-glow--right" />
        <SectionHead id="plus-title" lead="Des outils de grande enseigne, rendus simples." title="Pour aller plus loin" />
        <FeatureGrid columns={4} items={more} />
      </section>

      <section aria-labelledby="compare-title" className="lp-section">
        <SectionHead id="compare-title" title="Ce que PrestAfrik change concrètement" />
        <Compare rows={compare} />
      </section>

      <section aria-labelledby="equipe-title" className="lp-section">
        <SectionHead
          id="equipe-title"
         
          lead="Invitez vos collaborateurs par e-mail. Chacun voit ce dont il a besoin, vous gardez la main sur tout."
          title="Grandissez à plusieurs, en toute sérénité"
        />
        <FeatureGrid
          items={[
            { icon: BadgeCheck, title: "Propriétaire", text: "Accès complet : boutique, équipe, argent reçu, marketing et paramètres." },
            { icon: Zap, title: "Gestionnaire", text: "Produits, commandes, clients, livraisons et campagnes, sans toucher à l’équipe ni à l’abonnement." },
            { icon: Truck, title: "Préparateur de commandes", text: "Les commandes à préparer et les livraisons, rien de plus : simple et sûr." },
          ]}
        />
      </section>
    </PageShell>
  );
}
