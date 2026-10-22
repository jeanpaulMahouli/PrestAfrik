import { CalendarDays, MessageCircle, Store } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHead, Steps } from "@/components/landing/blocks";
import { LandingButton } from "@/components/landing/buttons";
import { ClientShowcase } from "@/components/landing/client-showcase";
import { DashboardShowcase } from "@/components/landing/dashboard-showcase";
import { disabledPages } from "@/components/landing/content";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";

export const metadata: Metadata = {
  title: { absolute: "Démo · PrestAfrik" },
  description: "Découvrez PrestAfrik en 3 minutes : la boutique côté client, la commande sur WhatsApp et le tableau de bord du vendeur.",
};

export default async function DemoPage() {
  // Page en attente de sa maquette (voir disabledPages dans content.ts).
  if (disabledPages.has("/demo")) notFound();
  const signedIn = await isSignedIn();
  return (
    <PageShell
      hero={{
        title: "Découvrez PrestAfrik en 3 minutes",
        subtitle: "Suivez une commande de bout en bout : de la boutique sur le téléphone de votre client jusqu’à l’argent reçu dans votre tableau de bord.",
        actions: (
          <>
            <LandingButton href="#parcours" variant="secondary">
              Commencer la visite
            </LandingButton>
            <LandingButton href={signedIn ? "/dashboard" : "/inscription"}>{signedIn ? "Aller à mon espace" : "Créer ma boutique gratuitement"}</LandingButton>
          </>
        ),
      }}
      signedIn={signedIn}
    >
      <section aria-labelledby="parcours-title" className="lp-section" id="parcours">
        <SectionHead id="parcours-title" lead="Trois moments, une seule application." title="Comment ça marche" />
        <Steps
          items={[
            { title: "Votre client commande", text: "Il ouvre votre lien, choisit ses articles et sa zone de livraison, voit le total exact et commande sans créer de compte." },
            { title: "Vous confirmez sur WhatsApp", text: "La commande arrive dans votre espace avec un message prêt à envoyer. Vous convenez de la livraison en un échange." },
            { title: "Vous encaissez et suivez", text: "Le client paie à la livraison, vous touchez « Valider » : l’argent reçu et le stock se mettent à jour tout seuls." },
          ]}
        />
      </section>

      <div className="lp-demo-step">
        <p className="lp-demo-step__label">
          <Store aria-hidden="true" size={18} /> Étape 1 · Ce que voit votre client
        </p>
      </div>
      <ClientShowcase signedIn={signedIn} />

      <div className="lp-demo-step">
        <p className="lp-demo-step__label">
          <MessageCircle aria-hidden="true" size={18} /> Étapes 2 et 3 · Ce que vous voyez
        </p>
      </div>
      <DashboardShowcase />

      <section aria-labelledby="perso-title" className="lp-section">
        <div className="lp-banner">
          <CalendarDays aria-hidden="true" className="lp-banner__icon" size={40} strokeWidth={1.6} />
          <div>
            <h2 className="lp-banner__title" id="perso-title">
              Envie d’une démonstration personnalisée ?
            </h2>
            <p>Un membre de l’équipe vous montre PrestAfrik avec vos propres produits et répond à toutes vos questions. C’est gratuit et sans engagement.</p>
          </div>
          <LandingButton className="lp-banner__action" href="/contact?sujet=demo" variant="secondary">
            Réserver ma démo
          </LandingButton>
        </div>
      </section>
    </PageShell>
  );
}
