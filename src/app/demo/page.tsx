import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { demoPage, disabledPages } from "@/components/landing/content";
import { LandingButton } from "@/components/landing/buttons";
import { DemoVideos } from "@/components/landing/demo-videos";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";
import { Partners } from "@/components/landing/partners";
import { Testimonials } from "@/components/landing/testimonials";

export const metadata: Metadata = {
  title: { absolute: "Démo · PrestAfrik" },
  alternates: { canonical: "/demo" },
  description: "Découvrez PrestAfrik en vidéo : créer sa boutique, gérer ses produits, recevoir ses commandes sur WhatsApp.",
};

/** Page Démo (maquette « Démo ») : vidéos par thème, témoignages et boutiques partenaires. Vidéos dans content.ts (demoPage). */
export default async function DemoPage() {
  if (disabledPages.has("/demo")) notFound();
  const signedIn = await isSignedIn();
  return (
    <PageShell className="lp-page--demo" cta={false} hero={{ title: demoPage.title, subtitle: demoPage.subtitle }} signedIn={signedIn}>
      <DemoVideos />
      {/* Pour ceux qui préfèrent lire : le guide pas à pas, avec la vraie interface animée. */}
      <section aria-labelledby="demo-guide-title" className="lp-demo-guide">
        <div>
          <h2 id="demo-guide-title">Vous préférez avancer à votre rythme ?</h2>
          <p>Le guide du vendeur explique chaque fonction du tableau de bord, étape par étape, avec des animations de la vraie interface : création de la boutique, produits, commandes, avis clients, livraisons…</p>
        </div>
        <LandingButton href="/aide/guide">Lire le guide du vendeur</LandingButton>
      </section>
      <Testimonials />
      <Partners />
    </PageShell>
  );
}
