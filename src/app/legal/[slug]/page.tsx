import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal/legal-page";

const operator = {
  name: process.env.LEGAL_OPERATOR_NAME || "[Dénomination légale de l’éditeur à compléter]",
  form: process.env.LEGAL_OPERATOR_FORM || "[Forme juridique à compléter]",
  address: process.env.LEGAL_OPERATOR_ADDRESS || "[Adresse au Cameroun à compléter]",
  registration:
    process.env.LEGAL_OPERATOR_REGISTRATION || "[RCCM ou immatriculation applicable à compléter]",
  taxId: process.env.LEGAL_OPERATOR_TAX_ID || "[NIU / identifiant fiscal applicable à compléter]",
  email: process.env.LEGAL_CONTACT_EMAIL || "[Adresse e-mail de contact à compléter]",
  phone: process.env.LEGAL_CONTACT_PHONE || "[Téléphone +237 à compléter]",
  hosting:
    process.env.LEGAL_HOSTING_PROVIDER || "[Hébergeur et pays d’hébergement à compléter]",
  privacyContact:
    process.env.LEGAL_PRIVACY_CONTACT || "[Contact chargé des données personnelles à compléter]",
};

const legalPages = {
  "mentions-legales": {
    title: "Mentions légales",
    content: (
      <>
        <h2>Éditeur de la plateforme</h2>
        <p>
          PrestAfrik est édité par {operator.name}, {operator.form}, dont l’adresse est
          {` ${operator.address}`}. Immatriculation : {operator.registration}. Identifiant fiscal :
          {` ${operator.taxId}`}. Contact : {operator.email} · {operator.phone}.
        </p>
        <h2>Publication et hébergement</h2>
        <p>
          Responsable de publication : [nom et qualité à compléter]. Hébergeur : {operator.hosting}.
          Le pays où sont hébergés l’application, les sauvegardes et les fichiers doit être indiqué
          avant ouverture au public.
        </p>
        <h2>Activité de la plateforme</h2>
        <p>
          PrestAfrik fournit un outil logiciel de création et de gestion de boutiques en ligne. Les
          vendeurs qui utilisent la plateforme restent responsables de leurs offres, produits,
          prix, informations commerciales, commandes et relation avec leurs acheteurs, sous réserve
          des obligations légales applicables.
        </p>
      </>
    ),
  },
  "conditions-generales": {
    title: "Conditions générales d’utilisation et d’abonnement",
    content: (
      <>
        <h2>Éditeur et acceptation</h2>
        <p>
          La plateforme est éditée par {operator.name}, établi(e) à {operator.address}. La création
          d’un compte permet d’accéder aux outils PrestAfrik sous réserve de la fourniture
          d’informations exactes et du respect des présentes conditions, qui doivent être
          finalisées avant leur acceptation contractuelle.
        </p>
        <h2>Service et compte</h2>
        <p>
          PrestAfrik met à disposition des fonctions de gestion de catalogue, commandes, clients,
          équipe et boutique publique. Le titulaire du compte est responsable de ses identifiants,
          des accès accordés à son équipe et des contenus qu’il publie. Il doit maintenir un moyen
          de contact valide et informer rapidement le support de tout accès non autorisé.
        </p>
        <h2>Essai, prix et facturation</h2>
        <p>
          L’essai dure un mois calendaire à compter de la création de la boutique. Les abonnements
          sont affichés et facturés en FCFA (XAF), aux prix présentés avant la souscription. Les
          offres actuellement configurées sont Essentiel à 3 000 FCFA par mois ou 30 000 FCFA par
          an, Business à 7 500 FCFA par mois ou 75 000 FCFA par an, et Pro à 15 000 FCFA par mois
          ou 150 000 FCFA par an. Les limites correspondantes sont affichées sur la page
          Abonnement. Aucun renouvellement automatique ni paiement réel ne doit être considéré
          actif tant que le prestataire et ses modalités ne sont pas configurés et présentés au
          client.
        </p>
        <h2>Résiliation, échéance et disponibilité</h2>
        <p>
          Le propriétaire peut demander l’arrêt de son abonnement selon les modalités qui seront
          affichées dans son compte. En cas d’échéance impayée, certaines fonctionnalités peuvent
          être limitées après notification ; les commandes déjà reçues et les données ne sont pas
          présentées comme effacées par cette seule limitation. Les maintenances, incidents réseau
          et dépendances de services tiers peuvent affecter temporairement la disponibilité.
        </p>
        <h2>Contenus et usages interdits</h2>
        <p>
          Le vendeur garantit disposer des droits nécessaires sur ses contenus et produits. Sont
          interdits les contenus ou usages illicites, frauduleux, portant atteinte aux droits
          d’autrui ou utilisant les coordonnées des acheteurs à des fins non autorisées.
        </p>
        <h2>Droit applicable</h2>
        <p>
          Les présentes conditions sont destinées à être régies par le droit camerounais, sous
          réserve des règles impératives applicables et des juridictions compétentes. Elles doivent
          être vérifiées et complétées avant publication.
        </p>
        <p>Contact contractuel : {operator.email} · {operator.phone}.</p>
      </>
    ),
  },
  "politique-de-confidentialite": {
    title: "Politique de confidentialité",
    content: (
      <>
        <h2>Qui traite les données ?</h2>
        <p>
          L’éditeur de PrestAfrik est {operator.name}, joignable à {operator.address} et à
          {` ${operator.email}`}. Contact relatif aux données personnelles : {operator.privacyContact}.
        </p>
        <p>
          PrestAfrik traite les données du compte vendeur pour fournir le service. Pour les
          coordonnées de l’acheteur, ses commandes et ses échanges commerciaux, le vendeur de la
          boutique est l’interlocuteur commercial direct et doit informer ses clients. La
          répartition précise des responsabilités entre la plateforme et chaque vendeur doit être
          formalisée avant le lancement.
        </p>
        <h2>Données et finalités</h2>
        <ul>
          <li>Compte vendeur : nom, adresse e-mail, identifiants et appartenance à une équipe.</li>
          <li>
            Boutique et commandes : produits, coordonnées de livraison ou de contact, commandes,
            paiements enregistrés par le vendeur et échanges de suivi.
          </li>
          <li>
            Messages et prospection : préférences et consentements enregistrés ; les campagnes
            marketing ne doivent être envoyées qu’aux destinataires ayant donné le consentement
            requis et doivent proposer un moyen de retrait.
          </li>
          <li>
            Données techniques : journaux nécessaires à la sécurité, au diagnostic et à la
            prévention des abus.
          </li>
        </ul>
        <p>
          Ces données servent à créer et sécuriser les comptes, fournir les fonctions demandées,
          traiter les commandes, assister les utilisateurs, respecter les obligations applicables
          et protéger la plateforme. Les durées de conservation par catégorie restent à fixer et à
          documenter avant ouverture au public.
        </p>
        <h2>Destinataires, prestataires et transferts</h2>
        <p>
          L’accès est limité aux personnes habilitées et aux prestataires nécessaires (hébergement,
          e-mail, stockage, paiement ou messagerie) une fois ceux-ci effectivement sélectionnés.
          Certains prestataires peuvent héberger ou traiter des données hors du Cameroun : leur
          identité, le pays concerné et les garanties applicables doivent être renseignés avant
          activation.
        </p>
        <h2>Choix, droits et sécurité</h2>
        <p>
          Toute personne peut adresser une demande concernant ses données à {operator.email} en
          précisant son identité et l’objet de sa demande. Les droits applicables et leurs modalités
          seront traités selon la législation camerounaise en vigueur et les autres règles
          éventuellement applicables. Des mesures de contrôle d’accès, de sauvegarde et de
          protection des communications doivent être maintenues ; aucun service en ligne ne peut
          garantir un risque nul.
        </p>
        <h2>Cookies et stockage local</h2>
        <p>
          Le service utilise les éléments techniques indispensables à la connexion et au
          fonctionnement du panier. Tout outil de mesure d’audience, publicité ou traceur non
          essentiel devra être déclaré et soumis aux choix de l’utilisateur avant son activation.
        </p>
        <h2>Cadre juridique</h2>
        <p>
          La politique doit être relue au regard notamment des règles camerounaises sur les données
          personnelles, la cybersécurité, les communications électroniques et le commerce
          électronique, ainsi que des règles impératives applicables aux transferts internationaux.
        </p>
      </>
    ),
  },
  "conditions-de-vente": {
    title: "Informations commerciales et conditions de vente",
    content: (
      <>
        <h2>Le vendeur est votre interlocuteur</h2>
        <p>
          Chaque boutique PrestAfrik est exploitée par le vendeur indiqué sur sa vitrine. Le vendeur,
          et non PrestAfrik, définit les produits, les prix, les disponibilités, les modalités de
          livraison et les moyens de paiement proposés. PrestAfrik fournit l’outil technique et
          n’est pas le vendeur des produits affichés.
        </p>
        <h2>Informations à afficher par boutique</h2>
        <p>
          Avant de publier sa boutique, le vendeur doit compléter et communiquer son identité
          commerciale et ses coordonnées, une description exacte des produits, le prix total en XAF,
          les frais et zones de livraison, les délais indicatifs, les moyens de paiement, les règles
          de confirmation et d’annulation et un contact pour les réclamations. Les taxes et mentions
          fiscales doivent être présentées conformément à sa situation et aux règles applicables.
        </p>
        <h2>Commande, paiement et livraison</h2>
        <p>
          Le vendeur doit préciser à quel moment une commande est acceptée, comment son contenu et
          son prix sont confirmés, si le paiement se fait à la livraison ou par un moyen électronique,
          qui livre, les frais applicables et comment une livraison échouée est traitée. Une
          notification WhatsApp ou une mention de paiement ne constitue une confirmation que dans
          les conditions communiquées à l’acheteur et vérifiées par le vendeur.
        </p>
        <h2>Rétractation, retours et réclamations</h2>
        <p>
          Le vendeur doit publier les conditions de retour, d’échange, de remboursement, d’annulation
          et de traitement des réclamations adaptées aux produits vendus, sans réduire les droits
          impératifs reconnus aux consommateurs. Les délais et exceptions ne doivent pas être
          inventés ou présentés comme universels : le vendeur doit les vérifier au regard de son
          activité et du droit camerounais applicable.
        </p>
        <h2>Modèle à personnaliser</h2>
        <p>
          Cette page est une information générale, pas les conditions de vente d’un vendeur
          déterminé. Chaque marchand doit publier ses propres conditions et mentions d’identité sur
          sa vitrine avant d’accepter des commandes. L’acheteur doit les consulter et contacter
          directement le marchand pour une question relative à son achat.
        </p>
      </>
    ),
  },
} as const;

type LegalSlug = keyof typeof legalPages;

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return Object.keys(legalPages).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = legalPages[slug as LegalSlug];
  return { title: page?.title ?? "Informations légales" };
}

export default async function LegalDocumentPage({
  params,
}: PageProps<"/legal/[slug]">) {
  const { slug } = await params;
  if (!Object.hasOwn(legalPages, slug)) notFound();
  const page = legalPages[slug as LegalSlug];

  return <LegalPage title={page.title}>{page.content}</LegalPage>;
}
