import type { Metadata } from "next";
import { LandingButton } from "@/components/landing/buttons";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";
import { PricingTable } from "@/components/landing/pricing-table";
import { clubDes1000, pricingPlans, pricingSalesOpen, trialLabel } from "@/config/pricing";

export const metadata: Metadata = {
  title: { absolute: "Tarifs : boutique en ligne dès 1 000 FCFA par mois | PrestAfrik" },
  description: "Les offres PrestAfrik : Démarrage, Business et Market. Un mois d’essai offert, paiement mensuel ou annuel en FCFA, sans engagement.",
  alternates: { canonical: "/tarifs" },
};

// Le bandeau Club des 1000 dépend d'une variable d'environnement lue à chaque visite.
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const signedIn = await isSignedIn();
  const club = clubDes1000();
  const salesOpen = pricingSalesOpen();
  return (
    <PageShell
      className="lp-page--pricing"
      hero={{
        title: "Des tarifs simples, en FCFA, sans engagement",
        subtitle: `${trialLabel}. Choisissez ensuite l’offre qui correspond à votre commerce : vous pouvez en changer à tout moment.`,
      }}
      signedIn={signedIn}
    >
      <section aria-label="Offres" className="lp-section pricing">
        {club.active && (
          <aside aria-label="Promotion Club des 1000" className="pricing-club">
            <p>
              <strong>{club.title}</strong> {club.text}
            </p>
            <div className="pricing-club-actions">
              <a className="lp-btn lp-btn--secondary" href={club.channelUrl} rel="noopener noreferrer" target="_blank">
                Rejoindre la communauté WhatsApp
              </a>
              <LandingButton href={signedIn ? "/dashboard" : "/inscription"}>{signedIn ? "Aller à mon espace" : "Créer ma boutique gratuitement maintenant"}</LandingButton>
            </div>
          </aside>
        )}
        <PricingTable plans={pricingPlans} salesOpen={salesOpen} signupHref={signedIn ? "/dashboard" : "/inscription"} />
        {!salesOpen && (
          <p className="pricing-note" id="pricing-soon">
            Les offres payantes ne sont pas encore ouvertes : en attendant, PrestAfrik est entièrement gratuit, sans rien à payer.
          </p>
        )}
        <p className="pricing-note">Prix en francs CFA (FCFA), paiement mensuel ou annuel, sans engagement.</p>
        <p className="pricing-final">
          <LandingButton href={signedIn ? "/dashboard" : "/inscription"}>{signedIn ? "Aller à mon espace" : "Commencer mon essai gratuit"}</LandingButton>
        </p>
      </section>
    </PageShell>
  );
}
