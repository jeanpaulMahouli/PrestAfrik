import type { Metadata } from "next";
import { LandingButton } from "@/components/landing/buttons";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";
import { StoreCard } from "@/components/marketplace/store-card";
import { VendorSearch } from "@/components/marketplace/vendor-search";
import { getTopProducts, getTopStores } from "@/modules/marketplace/search";

export const metadata: Metadata = {
  title: { absolute: "Nos boutiques : trouvez un vendeur PrestAfrik | PrestAfrik" },
  description: "Les boutiques PrestAfrik les mieux notées par leurs clients. Cherchez un vendeur par nom, ville ou activité et commandez sur WhatsApp, paiement à la livraison.",
  alternates: { canonical: "/nos-boutiques" },
};

export const dynamic = "force-dynamic";

/** Toutes nos boutiques : recherche de vendeurs et Top 10 des boutiques les mieux notées. */
export default async function StoresPage() {
  const signedIn = await isSignedIn();
  const top = await getTopStores(10);
  const products = await Promise.all(top.map((store) => getTopProducts(store.id)));
  return (
    <PageShell
      className="lp-page--search"
      hero={{
        title: "Nos boutiques",
        subtitle: "Trouvez un vendeur par son nom, sa ville ou son activité. Vous commandez sur sa boutique, il confirme sur WhatsApp, vous payez à la livraison.",
        actions: <VendorSearch className="vendor-search--hero" />,
      }}
      signedIn={signedIn}
    >
      <section aria-labelledby="top-boutiques" className="lp-section search-results">
        <header className="lp-section__head">
          <h2 className="lp-title" id="top-boutiques">
            Top 10 des boutiques
          </h2>
          <p className="lp-lead">Classées selon les avis de leurs clients, puis selon le nombre de produits en ligne.</p>
        </header>
        {top.length > 0 ? (
          <ol className="search-grid">
            {top.map((store, index) => (
              <li key={store.id}>
                <StoreCard products={products[index] ?? []} rank={index + 1} store={store} />
              </li>
            ))}
          </ol>
        ) : (
          <div className="search-empty">
            <h3>Les premières boutiques arrivent</h3>
            <p>Vous êtes vendeur ? Votre boutique pourrait être la première de ce classement.</p>
            <LandingButton href="/inscription">Créer ma boutique gratuitement</LandingButton>
          </div>
        )}
      </section>
    </PageShell>
  );
}
