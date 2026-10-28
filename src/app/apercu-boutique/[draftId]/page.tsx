import { Banknote, MapPin, PackageCheck } from "lucide-react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { StorefrontProductGrid } from "@/components/storefront/storefront-product-grid";
import { attachedPhotoUrl, photoVariant } from "@/lib/product-photos";
import { auth } from "@/modules/auth/server";
import { formatXaf } from "@/modules/catalog/service";
import { getAccessibleTextColor } from "@/modules/stores/appearance";
import { findDraft } from "@/modules/stores/draft";
import { deliverySummary } from "@/modules/storefront/data";

export const dynamic = "force-dynamic";

const defaults = { primary: "#FF9900", secondary: "#000026", accent: "#EF765E" };
const hex = (value: string | undefined, fallback: string) => (value && /^#[\da-f]{6}$/i.test(value) ? value : fallback);

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

  const primary = hex(data.primaryColor, defaults.primary);
  const secondary = hex(data.secondaryColor, defaults.secondary);
  const name = data.name?.trim() || "Ma boutique";
  const zones = (data.deliveryZones ?? [])
    .map((zone, index) => ({ id: String(index), label: zone.name, city: data.city ?? "", feeXaf: zone.feeXaf, delay: zone.estimatedDelay }))
    .sort((a, b) => a.feeXaf - b.feeXaf);
  const pickupEnabled = data.pickupEnabled ?? true;

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
        theme: data.theme ?? "CATALOGUE_EXPRESS",
        promoStyle: "CLASSIQUE",
        colors: { primary, onPrimary: getAccessibleTextColor(primary), secondary, onSecondary: getAccessibleTextColor(secondary), accent: hex(data.accentColor, defaults.accent) },
      }}
    >
      <main className="sf-home">
        <h1 className="visually-hidden" data-store-name="">{name}</h1>
        <p className="sf-description sf-home-description" data-store-description="" hidden={!data.description}>
          {data.description}
        </p>
        <form className="sf-search" role="search">
          <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="18"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input aria-label="Rechercher un produit" placeholder="Rechercher un produit" readOnly tabIndex={-1} type="search" />
        </form>
        {(data.theme ?? "CATALOGUE_EXPRESS") !== "GRAND_MARCHE" && <p className="sf-info">{deliverySummary({ zones, store: { pickupEnabled } as never }, formatXaf)}</p>}
        <ul aria-label="Nos engagements" className="sf-trust">
          <li>
            <Banknote aria-hidden="true" size={20} />
            <span><strong>Paiement à la livraison</strong><small>Vous payez à la réception</small></span>
          </li>
          <li>
            <PackageCheck aria-hidden="true" size={20} />
            <span><strong>Suivi de commande</strong><small>Un lien pour suivre votre colis</small></span>
          </li>
          {data.city && (
            <li>
              <MapPin aria-hidden="true" size={20} />
              <span><strong>Boutique à {data.city}</strong><small>Un vendeur proche de vous</small></span>
            </li>
          )}
        </ul>
        <section aria-labelledby="sf-all-title" className="sf-home-section">
          <header className="sf-home-section-head">
            <h2 id="sf-all-title">Tous nos produits</h2>
          </header>
          <StorefrontProductGrid base="" products={products} />
        </section>
      </main>
    </StorefrontShell>
  );
}
