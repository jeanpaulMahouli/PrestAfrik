import { Smartphone, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeatureGrid, SectionHead } from "@/components/landing/blocks";
import { LandingButton } from "@/components/landing/buttons";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";
import { VendorSearch } from "@/components/marketplace/vendor-search";
import { countryPages, findCountryPage } from "@/config/country-pages";
import { WhatsAppLogoIcon } from "@/components/ui/whatsapp-icon";

export function generateStaticParams() {
  return countryPages.map((page) => ({ pays: page.slug }));
}

export async function generateMetadata({ params }: PageProps<"/pays/[pays]">): Promise<Metadata> {
  const page = findCountryPage((await params).pays);
  if (!page) return {};
  return {
    title: { absolute: `Créer une boutique en ligne ${page.locative} et vendre sur WhatsApp | PrestAfrik` },
    description: `Créez gratuitement votre boutique en ligne ${page.locative} : commandes sur WhatsApp, paiement à la livraison, en FCFA.`,
    alternates: { canonical: `/pays/${page.slug}` },
    // Gabarit sans contenu propre au pays : pas d'indexation avant qu'il soit rédigé.
    robots: page.ready ? undefined : { index: false, follow: true },
  };
}

/** Gabarit des pages par pays : les blocs communs, avec le nom du pays et ses grandes villes. */
export default async function CountryPage({ params }: PageProps<"/pays/[pays]">) {
  const page = findCountryPage((await params).pays);
  if (!page) notFound();
  const signedIn = await isSignedIn();
  return (
    <PageShell
      hero={{
        title: `Votre boutique en ligne ${page.locative}`,
        subtitle: `Vendez ${page.locative} sans site compliqué : vos clients commandent sur votre boutique, vous confirmez sur WhatsApp, ils paient à la livraison en FCFA.`,
        actions: <LandingButton href={signedIn ? "/dashboard" : "/inscription"}>{signedIn ? "Aller à mon espace" : "Créer ma boutique gratuitement"}</LandingButton>,
      }}
      signedIn={signedIn}
    >
      <section aria-labelledby="pays-atouts" className="lp-section">
        <SectionHead id="pays-atouts" title={`Pensé pour les commerçants ${page.locative}`} />
        <FeatureGrid
          items={[
            { icon: Smartphone, title: "Prête en 5 minutes", text: "Nom, produits, zones de livraison : votre boutique est en ligne depuis votre téléphone." },
            { icon: WhatsAppLogoIcon, title: "Commandes sur WhatsApp", text: "Chaque commande arrive avec le détail et le total : vous confirmez en un message." },
            { icon: Truck, title: "Paiement à la livraison", text: `Vos clients paient en espèces ou par mobile money à la réception, partout ${page.locative}.` },
          ]}
        />
      </section>
      <section aria-labelledby="pays-vendeurs" className="lp-section search-results">
        <SectionHead id="pays-vendeurs" lead="Trouvez une boutique PrestAfrik près de chez vous." title={`Des vendeurs ${page.locative}`} />
        <div className="search-suggestions">
          {page.cities.map((city) => (
            <Link href={`/recherche?q=${encodeURIComponent(city)}`} key={city}>
              {city}
            </Link>
          ))}
        </div>
        <div className="country-search">
          <VendorSearch defaultValue="" />
        </div>
      </section>
    </PageShell>
  );
}
