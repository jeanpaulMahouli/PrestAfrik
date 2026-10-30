import type { Metadata } from "next";
import Link from "next/link";
import { LandingButton } from "@/components/landing/buttons";
import { faq } from "@/components/landing/content";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: { absolute: "Centre d’aide · PrestAfrik" },
  description: "Créer votre boutique, recevoir des commandes sur WhatsApp, livrer, encaisser : toutes les réponses pour bien utiliser PrestAfrik.",
  alternates: { canonical: "/aide" },
};

type Topic = { id: string; title: string; items: { question: string; answer: string }[] };

// Réponses courtes et concrètes, rangées par étape de la vie d'une boutique. Les questions générales
// (paiement, livraison, équipe, prix) reprennent celles de l'accueil (components/landing/content.ts).
const topics: Topic[] = [
  {
    id: "demarrer",
    title: "Démarrer",
    items: [
      {
        question: "Comment créer ma boutique ?",
        answer: "Créez votre compte (e-mail ou Google, puis votre numéro WhatsApp), ouvrez « Créer ma boutique maintenant » et suivez les 9 étapes : nom, activité, ville, coordonnées, apparence, premier produit, livraison. Comptez environ 5 minutes.",
      },
      {
        question: "Pourquoi ma boutique n’est-elle pas encore visible ?",
        answer: "Une boutique est mise en ligne dès qu’elle a au moins un produit actif et une façon de livrer (zone de livraison ou retrait). Votre tableau de bord indique ce qu’il manque.",
      },
      {
        question: "Comment partager ma boutique ?",
        answer: "Dans votre tableau de bord, touchez « Partager » : copiez le lien, téléchargez le QR code ou envoyez-le directement sur WhatsApp et les réseaux sociaux.",
      },
      {
        question: "Puis-je installer PrestAfrik sur mon téléphone ?",
        answer: "Oui : dans le menu de votre compte, touchez « Installer l’application ». Sur iPhone, ouvrez PrestAfrik dans Safari, touchez Partager puis « Sur l’écran d’accueil ».",
      },
    ],
  },
  {
    id: "commandes",
    title: "Commandes et clients",
    items: [
      {
        question: "Comment suis-je prévenu d’une nouvelle commande ?",
        answer: "La commande apparaît dans « Commandes » et vous recevez un e-mail. Écrivez au client sur WhatsApp en un geste depuis la commande, puis touchez « Valider » une fois qu’elle est payée.",
      },
      ...faq.items.filter((item) => /créer un compte|équipe/i.test(item.question)),
    ],
  },
  {
    id: "livraison",
    title: "Livraison et paiement",
    items: faq.items.filter((item) => /paient|livraison/i.test(item.question)),
  },
  {
    id: "compte",
    title: "Compte, offres et WhatsApp",
    items: [
      ...faq.items.filter((item) => /coûte|wa\.me/i.test(item.question)),
      {
        question: "J’ai oublié mon mot de passe",
        answer: "Sur la page de connexion, touchez « Mot de passe oublié ? » : un lien valable 60 minutes vous est envoyé par e-mail.",
      },
    ],
  },
];

export default async function HelpPage() {
  const signedIn = await isSignedIn();
  return (
    <PageShell
      hero={{
        title: "Centre d’aide",
        subtitle: "Les réponses aux questions des vendeurs, de la création de la boutique à la livraison. Vous ne trouvez pas ? Écrivez-nous, nous répondons vite.",
      }}
      signedIn={signedIn}
    >
      <section aria-label="Sujets d’aide" className="lp-section help">
        <nav aria-label="Sujets" className="help-topics">
          {topics.map((topic) => (
            <a href={`#${topic.id}`} key={topic.id}>
              {topic.title}
            </a>
          ))}
        </nav>
        {topics.map((topic) => (
          <section aria-labelledby={`${topic.id}-title`} className="help-topic" id={topic.id} key={topic.id}>
            <h2 id={`${topic.id}-title`}>{topic.title}</h2>
            {topic.items.map((item) => (
              <details className="help-item" key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </section>
        ))}
        <div className="help-contact">
          <h2>Besoin d’un coup de main ?</h2>
          <p>
            Écrivez-nous depuis la page Contact ou à <a href={`mailto:${site.email}`}>{site.email}</a> : un membre de l’équipe vous répond.
          </p>
          <LandingButton href="/contact">Contacter l’équipe</LandingButton>
          <p className="help-small">
            Vous découvrez PrestAfrik ? <Link href="/demo">Voir la démo guidée</Link>.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
