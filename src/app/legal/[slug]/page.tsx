import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal/legal-page";
import { disabledPages } from "@/components/landing/content";
import { billingEnabled } from "@/config/billing";
import { site } from "@/config/site";

// Les mentions légales sont désactivées (disabledPages) tant que l'identité juridique de l'entreprise
// (forme, siège, RCCM, NIU, responsable de publication) n'est pas connue.

const contact = (
  <>
    <a href={`mailto:${site.email}`}>{site.email}</a> ·{" "}
    {site.phones.map((phone, index) => (
      <span key={phone}>
        {index > 0 && " / "}
        <a href={`tel:${phone.replaceAll(" ", "")}`}>{phone}</a>
      </span>
    ))}
  </>
);

const legalPages = {
  "mentions-legales": {
    title: "Mentions légales",
    content: (
      <>
        <h2>Éditeur de la plateforme</h2>
        <p>PrestAfrik. Contact : {contact}.</p>
        <h2>Activité de la plateforme</h2>
        <p>
          PrestAfrik fournit un outil logiciel de création et de gestion de boutiques en ligne. Les
          vendeurs qui utilisent la plateforme restent responsables de leurs offres, produits,
          prix, informations commerciales, commandes et relation avec leurs acheteurs.
        </p>
      </>
    ),
  },
  "conditions-generales": {
    title: "Conditions générales d’utilisation",
    content: (
      <>
        <h2>Objet</h2>
        <p>
          Les présentes conditions encadrent l’utilisation de PrestAfrik, plateforme qui permet aux
          commerçants de créer leur boutique en ligne et de gérer leurs produits, commandes et
          clients. Créer un compte vaut acceptation de ces conditions.
        </p>
        <h2>Service et compte</h2>
        <p>
          PrestAfrik met à disposition des fonctions de gestion de catalogue, commandes, clients,
          équipe et boutique publique. Le titulaire du compte fournit des informations exactes. Il
          est responsable de ses identifiants, des accès accordés à son équipe et des contenus qu’il
          publie. Il garde un moyen de contact valide et prévient rapidement PrestAfrik de tout
          accès non autorisé.
        </p>
        <h2>Prix</h2>
        {billingEnabled ? (
          <p>
            Les abonnements sont présentés et facturés en FCFA (XAF). Les prix et les limites de
            chaque offre sont affichés sur la page Abonnement avant toute souscription. Aucun
            paiement n’est effectué sans l’accord du titulaire du compte.
          </p>
        ) : (
          <p>
            L’utilisation de PrestAfrik est actuellement gratuite. Si des offres payantes sont
            proposées, leurs prix en FCFA (XAF) et leurs limites seront affichés avant toute
            souscription, et aucun paiement ne sera effectué sans l’accord du titulaire du compte.
          </p>
        )}
        <h2>Disponibilité</h2>
        <p>
          PrestAfrik s’efforce de garder le service accessible en permanence. Des maintenances, des
          incidents réseau ou des services tiers peuvent toutefois l’interrompre temporairement.
        </p>
        <h2>Contenus et usages interdits</h2>
        <p>
          Le vendeur garantit disposer des droits nécessaires sur ses contenus et produits. Sont
          interdits les contenus ou usages illicites, frauduleux, portant atteinte aux droits
          d’autrui ou utilisant les coordonnées des acheteurs à des fins non autorisées. PrestAfrik
          peut suspendre une boutique qui ne respecte pas ces règles.
        </p>
        <h2>Droit applicable</h2>
        <p>Les présentes conditions sont régies par le droit camerounais.</p>
        <h2>Contact</h2>
        <p>{contact}.</p>
      </>
    ),
  },
  "politique-de-confidentialite": {
    title: "Politique de confidentialité",
    content: (
      <>
        <h2>Qui traite les données ?</h2>
        <p>
          PrestAfrik traite les données du compte vendeur pour fournir le service. Pour les
          coordonnées de l’acheteur, ses commandes et ses échanges commerciaux, le vendeur de la
          boutique est l’interlocuteur commercial direct de son client. Pour toute question sur vos
          données : {contact}.
        </p>
        <h2>Données et finalités</h2>
        <ul>
          <li>Compte vendeur : nom, adresse e-mail, identifiants et appartenance à une équipe.</li>
          <li>
            Boutique et commandes : produits, coordonnées de livraison ou de contact, commandes,
            paiements enregistrés par le vendeur et échanges de suivi.
          </li>
          <li>
            Messages et prospection : préférences et consentements enregistrés. Les messages
            marketing ne sont envoyés qu’aux personnes qui l’ont accepté.
          </li>
          <li>
            Données techniques : journaux nécessaires à la sécurité, au diagnostic et à la
            prévention des abus.
          </li>
        </ul>
        <p>
          Ces données servent à créer et sécuriser les comptes, fournir les fonctions demandées,
          traiter les commandes, assister les utilisateurs, respecter les obligations applicables
          et protéger la plateforme. Elles sont conservées tant que le compte est actif, puis le
          temps nécessaire au respect de ces obligations.
        </p>
        <h2>Destinataires et prestataires</h2>
        <p>
          L’accès est limité aux personnes habilitées et aux prestataires techniques nécessaires au
          service : hébergement, base de données, stockage des images, envoi d’e-mails et sécurité du
          réseau. Certains de ces prestataires peuvent héberger ou traiter des données hors du
          Cameroun. PrestAfrik ne vend pas vos données.
        </p>
        <h2>Vos droits et la sécurité</h2>
        <p>
          Vous pouvez demander l’accès à vos données, leur correction ou leur suppression en écrivant
          à <a href={`mailto:${site.email}`}>{site.email}</a>, en précisant votre identité et l’objet
          de votre demande. Les accès sont contrôlés et les communications sont chiffrées ; aucun
          service en ligne ne peut toutefois garantir un risque nul.
        </p>
        <h2>Cookies et stockage local</h2>
        <p>
          PrestAfrik utilise uniquement les éléments techniques indispensables à la connexion et au
          fonctionnement du panier. Aucun outil publicitaire ni traceur de mesure d’audience n’est
          utilisé.
        </p>
      </>
    ),
  },
  "conditions-de-vente": {
    title: "Conditions de vente",
    content: (
      <>
        <h2>Le vendeur est votre interlocuteur</h2>
        <p>
          Chaque boutique PrestAfrik est exploitée par le vendeur indiqué sur sa vitrine. Le vendeur,
          et non PrestAfrik, définit les produits, les prix, les disponibilités, les modalités de
          livraison et les moyens de paiement proposés. PrestAfrik fournit l’outil technique et
          n’est pas le vendeur des produits affichés.
        </p>
        <h2>Informations fournies par la boutique</h2>
        <p>
          Le vendeur s’engage à présenter des produits décrits avec exactitude, des prix en FCFA
          (XAF), ses frais et zones de livraison, ses délais indicatifs, ses moyens de paiement et un
          contact pour les réclamations.
        </p>
        <h2>Commande, paiement et livraison</h2>
        <p>
          Après votre commande, le vendeur vous contacte pour la confirmer, généralement sur
          WhatsApp. Le paiement se fait selon les modalités indiquées par le vendeur, le plus souvent
          à la livraison ou au retrait en boutique. Vous pouvez suivre votre commande grâce au lien
          de suivi reçu après l’avoir passée.
        </p>
        <h2>Retours et réclamations</h2>
        <p>
          Les conditions de retour, d’échange, de remboursement et d’annulation sont celles du
          vendeur, dans le respect des droits reconnus aux consommateurs par le droit camerounais.
          Pour toute question sur un achat, contactez directement la boutique. Si vous ne parvenez
          pas à joindre un vendeur, écrivez-nous : {contact}.
        </p>
      </>
    ),
  },
} as const;

type LegalSlug = keyof typeof legalPages;

export const dynamic = "force-dynamic";

const isAvailable = (slug: string): slug is LegalSlug => Object.hasOwn(legalPages, slug) && !disabledPages.has(`/legal/${slug}`);

export function generateStaticParams() {
  return Object.keys(legalPages)
    .filter(isAvailable)
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: isAvailable(slug) ? legalPages[slug].title : "Informations légales" };
}

export default async function LegalDocumentPage({ params }: PageProps<"/legal/[slug]">) {
  const { slug } = await params;
  if (!isAvailable(slug)) notFound();
  const page = legalPages[slug];

  return <LegalPage title={page.title}>{page.content}</LegalPage>;
}
