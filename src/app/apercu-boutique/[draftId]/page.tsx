import { Suspense } from "react";
import { CatalogToolbar } from "@/components/storefront/catalog-toolbar";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { StorefrontProductGrid } from "@/components/storefront/storefront-product-grid";
import { attachedPhotoUrl, photoVariant } from "@/lib/product-photos";
import { auth } from "@/modules/auth/server";
import { findDraft } from "@/modules/stores/draft";

export const dynamic = "force-dynamic";


/**
 * Aperçu de la boutique pendant l'assistant de création (/boutiques/nouvelle), affiché dans le même cadre
 * de téléphone que « Ma boutique » : mêmes composants et mêmes styles que la vitrine publique, avec les
 * réponses du brouillon. « nouvelle » : aucune étape encore enregistrée (valeurs par défaut).
 * Réservé au propriétaire du brouillon ; rien n'y est cliquable.
 */
export default async function DraftPreviewPage({ params }: PageProps<"/apercu-boutique/[draftId]">) {
  const { draftId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  const draft = draftId === "nouvelle" ? null : await findDraft(session.user.id, draftId);
  if (draftId !== "nouvelle" && (!draft || draft.id !== draftId)) notFound();
  const data = draft?.data ?? {};

  const name = data.name?.trim() || "Ma boutique";

  // Le premier produit saisi, puis des exemples pour montrer la grille telle qu'elle sera remplie.
  const products = [
    ...(data.product
      ? [
          {
            id: "premier-produit",
            name: data.product.name,
            slug: "premier-produit",
            priceXaf: data.product.priceXaf,
            promotionalPriceXaf: null,
            images: data.product.photos[0] ? [{ url: photoVariant(attachedPhotoUrl(draftId, "tmp", data.product.photos[0].key), 800), altText: data.product.photos[0].alt ?? null }] : [],
          },
        ]
      : []),
    ...[1, 2, 3, 4].map((index) => ({ id: `exemple-${index}`, name: `Exemple de produit ${index}`, slug: `exemple-${index}`, priceXaf: 5000 * index, promotionalPriceXaf: null, images: [] })),
  ].slice(0, 4);

  return (
    <StorefrontShell
      base=""
      chat={null}
      className="sf-draft-preview"
      isPreview
      pages={[]}
      store={{
        id: draftId,
        name,
        slug: data.slug ?? "ma-boutique",
        city: data.city ?? null,
        logoUrl: data.logoUrl ?? null,
        description: data.description ?? null,
        promoStyle: "CLASSIQUE",
      }}
    >
      <main className="sf-home">
        <h1 className="visually-hidden" data-store-name="">{name}</h1>
        <p className="sf-description sf-home-description" data-store-description="" hidden={!data.description}>
          {data.description}
        </p>
        {/* Même accueil que la vitrine publique (nouveau design) : barre du catalogue puis la grille. */}
        <div className="sf-catalog-head" id="produits">
          <Suspense fallback={null}>
            <CatalogToolbar categories={[]} />
          </Suspense>
        </div>
        <section aria-labelledby="sf-all-title" className="sf-home-section">
          <header className="sf-home-section-head">
            <h2 id="sf-all-title">Tous les produits</h2>
          </header>
          <StorefrontProductGrid base="" products={products} />
        </section>
      </main>
    </StorefrontShell>
  );
}
