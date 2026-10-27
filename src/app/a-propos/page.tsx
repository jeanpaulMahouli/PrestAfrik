import { Globe, HeartHandshake, Lock, MessageCircle, Rocket, Smartphone, Sparkles, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { FeatureGrid, SectionHead, Steps } from "@/components/landing/blocks";
import { LandingButton } from "@/components/landing/buttons";
import { disabledPages } from "@/components/landing/content";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";
import { Testimonials } from "@/components/landing/testimonials";

export const metadata: Metadata = {
  title: { absolute: "À propos · PrestAfrik" },
  alternates: { canonical: "/a-propos" },
  description:
    "PrestAfrik donne à chaque commerçant africain une boutique en ligne professionnelle, simple et gratuite pour démarrer. Notre mission, nos valeurs et nos engagements.",
};

export default async function AboutPage() {
  // Page en attente de sa maquette (voir disabledPages dans content.ts).
  if (disabledPages.has("/a-propos")) notFound();
  const signedIn = await isSignedIn();
  return (
    <PageShell
      hero={{
        title: "Chaque commerçant mérite les outils des plus grands",
        subtitle:
          "PrestAfrik est née d’une conviction : le talent commercial ne manque pas en Afrique, ce sont les bons outils qui manquent. Nous les rendons simples, accessibles et gratuits pour démarrer.",
      }}
      signedIn={signedIn}
    >
      <section aria-labelledby="mission-title" className="lp-section">
        <span aria-hidden="true" className="lp-glow lp-glow--left" />
        <div className="lp-story">
          <div className="lp-story__copy">
            <h2 className="lp-split__title" id="mission-title">
              Transformer chaque vendeur WhatsApp en marque professionnelle
            </h2>
            <p className="lp-split__text">
              Au Cameroun comme ailleurs sur le continent, des milliers de commerçants vendent chaque jour sur WhatsApp, Facebook ou dans leur quartier. Ils ont le produit, la clientèle et
              l’énergie. Mais les commandes se perdent dans les discussions, les totaux se calculent de tête et les clients fidèles se noient dans les contacts.
            </p>
            <p className="lp-split__text">
              PrestAfrik leur donne une vitrine à leur hauteur : une boutique en ligne prête en quelques minutes, des commandes claires qui arrivent sur WhatsApp, et un tableau de bord qui dit
              l’essentiel. Le tout pensé pour le téléphone, pour le paiement à la livraison et pour la façon dont on achète vraiment ici.
            </p>
          </div>
          <div className="lp-story__visual">
            <div className="lp-story__people">
              {["/landing/people/vendeuse-4.webp", "/landing/people/vendeur-3.webp", "/landing/people/linda.webp", "/landing/people/vendeur-1.webp"].map((src, i) => (
                <Image alt="" className={`lp-story__person lp-story__person--${i + 1}`} height={360} key={src} src={src} width={240} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="valeurs-title" className="lp-section">
        <SectionHead id="valeurs-title" lead="Quatre principes guident chacune de nos décisions produit." title="Ce en quoi nous croyons" />
        <FeatureGrid
          columns={4}
          items={[
            { icon: Sparkles, title: "La simplicité d’abord", text: "Si une fonctionnalité demande une formation, c’est qu’elle n’est pas terminée. Trois boutons valent mieux que trente." },
            { icon: HeartHandshake, title: "La confiance", text: "Paiement à la livraison, total connu d’avance, suivi sans compte : chaque détail rassure vos clients." },
            { icon: Globe, title: "Fait pour l’Afrique", text: "Mobile money, quartiers et points de repère, WhatsApp, connexions modestes : nous partons de vos réalités." },
            { icon: Rocket, title: "Accessible à tous", text: "Une boutique gratuite pour démarrer, sans engagement et sans compétence technique." },
          ]}
        />
      </section>

      <section aria-labelledby="engagements-title" className="lp-section">
        <SectionHead id="engagements-title" title="Ce que nous vous promettons" />
        <FeatureGrid
          items={[
            { icon: Lock, title: "Vos données vous appartiennent", text: "Exportez vos produits, vos commandes et vos clients quand vous voulez. Nous ne revendons jamais vos données ni celles de vos clients." },
            { icon: Smartphone, title: "Le téléphone en priorité", text: "Chaque écran est conçu d’abord pour un petit téléphone, puis adapté à l’ordinateur. Jamais l’inverse." },
            { icon: MessageCircle, title: "Un accompagnement humain", text: "Une question ? Écrivez-nous : une vraie personne vous répond, en français, avec plaisir." },
          ]}
        />
      </section>

      <section aria-labelledby="chemin-title" className="lp-section">
        <SectionHead id="chemin-title" lead="De la première commande à la marque reconnue, PrestAfrik grandit avec vous." title="Commencer petit, voir grand" />
        <Steps
          items={[
            { title: "Lancez-vous", text: "Créez votre boutique gratuitement, ajoutez vos premiers produits et partagez votre lien dans vos statuts." },
            { title: "Structurez", text: "Zones de livraison, fichier clients, argent reçu : votre activité devient lisible et vous prenez de meilleures décisions." },
            { title: "Développez", text: "Campagnes, équipe, pages de marque : vous passez de vendeur à entreprise, sans changer d’outil." },
          ]}
        />
        <div className="lp-center lp-center--tight">
          <LandingButton href={signedIn ? "/dashboard" : "/inscription"}>{signedIn ? "Aller à mon espace" : "Rejoindre PrestAfrik"}</LandingButton>
        </div>
      </section>

      <Testimonials />

      <section aria-labelledby="ambition-title" className="lp-section">
        <div className="lp-banner">
          <TrendingUp aria-hidden="true" className="lp-banner__icon" size={40} strokeWidth={1.6} />
          <div>
            <h2 className="lp-banner__title" id="ambition-title">
              Notre ambition
            </h2>
            <p>
              Que chaque commerçant africain qui le souhaite puisse vendre en ligne aussi professionnellement qu’une grande enseigne, sans en avoir les moyens ni les équipes. Votre réussite est
              notre seul indicateur.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
