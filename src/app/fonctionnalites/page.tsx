import { BadgeCheck, Bot, CheckCircle2, FileSpreadsheet, HandCoins, LayoutTemplate, Megaphone, MessageCircle, Palette, QrCode, ShieldCheck, Smartphone, Store, Truck, Users, Wallet, Zap } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnimatedBrowser, AnimatedPhone, DemoToast } from "@/components/landing/animated-demo";
import { Compare, SectionHead } from "@/components/landing/blocks";
import { LandingButton } from "@/components/landing/buttons";
import { comparison, disabledPages } from "@/components/landing/content";
import { DemoVideoButton } from "@/components/landing/demo-video-button";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";

export const metadata: Metadata = {
  title: { absolute: "Fonctionnalités · PrestAfrik" },
  alternates: { canonical: "/fonctionnalites" },
  description:
    "Boutique en ligne, commandes WhatsApp, paiement à la livraison, fichier clients, campagnes et équipe : tout ce qu’il faut pour vendre en ligne en Afrique centrale, dans un seul espace.",
};

const phone = (src: string, alt: string) => ({ src, alt, width: 1068, height: 2217 });
const screen = (src: string, alt: string) => ({ src, alt, width: 1280, height: 800 });

/** Démonstrations : peu de texte, l'écran parle. */
const demos = [
  {
    id: "boutique",
    kicker: "Côté client",
    title: "Une boutique qui donne envie d’acheter",
    points: ["Prête en 5 minutes", "Photos, prix et stock à jour", "Commande sans compte, en une minute"],
    visual: (
      <AnimatedPhone
        screens={[
          phone("/landing/screens/telephone-1-boutique.webp", "Boutique PrestAfrik sur téléphone"),
          phone("/landing/screens/telephone-2-detail.webp", ""),
          phone("/landing/screens/telephone-3-commande.webp", ""),
          phone("/landing/screens/telephone-4-suivi.webp", ""),
        ]}
      >
        <DemoToast icon={<CheckCircle2 size={18} />} text="Total exact, livraison comprise" title="Commande envoyée" />
      </AnimatedPhone>
    ),
  },
  {
    id: "commandes",
    kicker: "Côté vendeur",
    title: "Toute votre activité, en un coup d’œil",
    points: ["Commandes : Continuer sur WhatsApp, Valider, Voir", "Clients triés automatiquement", "Argent reçu compté au franc près"],
    visual: (
      <AnimatedBrowser
        screens={[
          screen("/landing/vendeur-commandes.webp", "Tableau de bord PrestAfrik : commandes"),
          screen("/landing/vendeur-clients.webp", ""),
          screen("/landing/vendeur-livraisons.webp", ""),
          screen("/landing/vendeur-argent.webp", ""),
        ]}
      >
        <DemoToast icon={<MessageCircle size={18} />} text="Robe wax × 2 · 27 500 FCFA" title="Nouvelle commande" />
      </AnimatedBrowser>
    ),
  },
];

const tiles = [
  { icon: Store, title: "Boutique en 5 minutes" },
  { icon: MessageCircle, title: "Commandes sur WhatsApp" },
  { icon: HandCoins, title: "Paiement à la livraison" },
  { icon: Truck, title: "Livraison par zones" },
  { icon: Users, title: "Fichier clients automatique" },
  { icon: Wallet, title: "Argent reçu suivi" },
  { icon: Megaphone, title: "Campagnes WhatsApp" },
  { icon: Palette, title: "Thèmes à vos couleurs" },
  { icon: LayoutTemplate, title: "Pages de marque" },
  { icon: Bot, title: "Assistant de discussion" },
  { icon: QrCode, title: "QR code et partage" },
  { icon: FileSpreadsheet, title: "Import et export CSV" },
  { icon: Smartphone, title: "Pensé pour le téléphone" },
  { icon: ShieldCheck, title: "Données protégées" },
];

const roles = [
  { icon: BadgeCheck, title: "Propriétaire", text: "Tout : boutique, équipe, argent, marketing." },
  { icon: Zap, title: "Gestionnaire", text: "Produits, commandes, clients et campagnes." },
  { icon: Truck, title: "Préparateur", text: "Les commandes à préparer et les livraisons." },
];

export default async function FeaturesPage() {
  if (disabledPages.has("/fonctionnalites")) notFound();
  const signedIn = await isSignedIn();
  return (
    <PageShell
      className="lp-page--features"
      hero={{
        title: "Tout pour vendre en ligne, rien de superflu",
        subtitle: "Regardez plutôt : voici PrestAfrik en action.",
        actions: (
          <>
            <DemoVideoButton fallbackHref="/demo" label="Voir la vidéo" />
            <LandingButton href={signedIn ? "/dashboard" : "/inscription"}>{signedIn ? "Aller à mon espace" : "Créer ma boutique gratuitement"}</LandingButton>
          </>
        ),
      }}
      signedIn={signedIn}
    >
      {demos.map((demo, index) => (
        <section aria-labelledby={`demo-${demo.id}`} className={`lp-section lp-feature-demo${index % 2 ? " lp-feature-demo--reverse" : ""}`} key={demo.id}>
          <span aria-hidden="true" className={`lp-glow lp-glow--${index % 2 ? "right" : "left"}`} />
          <div className="lp-feature-demo__copy">
            <p className="lp-feature-demo__kicker">{demo.kicker}</p>
            <h2 id={`demo-${demo.id}`}>{demo.title}</h2>
            <ul>
              {demo.points.map((point) => (
                <li key={point}>
                  <CheckCircle2 aria-hidden="true" size={20} />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-feature-demo__visual">{demo.visual}</div>
        </section>
      ))}

      <section aria-labelledby="outils-title" className="lp-section">
        <SectionHead id="outils-title" title="Et tout le reste, déjà inclus" />
        <ul className="lp-feature-tiles">
          {tiles.map(({ icon: Icon, title }) => (
            <li key={title}>
              <span aria-hidden="true">
                <Icon size={24} strokeWidth={1.8} />
              </span>
              {title}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="compare-title" className="lp-section">
        <SectionHead id="compare-title" title={comparison.title} />
        <Compare afterTitle={comparison.afterTitle} beforeTitle={comparison.beforeTitle} rows={comparison.rows} />
      </section>

      <section aria-labelledby="equipe-title" className="lp-section">
        <SectionHead id="equipe-title" title="Grandissez à plusieurs" />
        <ul className="lp-feature-roles">
          {roles.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span aria-hidden="true">
                <Icon size={22} strokeWidth={1.8} />
              </span>
              <strong>{title}</strong>
              <small>{text}</small>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
