import { Bot, FileSpreadsheet, HandCoins, LayoutTemplate, Megaphone, MessageCircle, Palette, QrCode, ShieldCheck, Smartphone, Store, Truck, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHead } from "@/components/landing/blocks";
import { LandingButton } from "@/components/landing/buttons";
import { disabledPages } from "@/components/landing/content";
import { DemoVideoButton } from "@/components/landing/demo-video-button";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";

export const metadata: Metadata = {
  title: { absolute: "Fonctionnalités · PrestAfrik" },
  alternates: { canonical: "/fonctionnalites" },
  description:
    "Boutique en ligne, commandes WhatsApp, paiement à la livraison, fichier clients, campagnes et équipe : tout ce qu’il faut pour vendre en ligne en Afrique centrale, dans un seul espace.",
};

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
      <section aria-labelledby="outils-title" className="lp-section lp-glass-zone">
        <SectionHead id="outils-title" title="Pensée uniquement pour répondre à vos besoins quotidiens" />
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
    </PageShell>
  );
}
