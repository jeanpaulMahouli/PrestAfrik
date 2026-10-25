import Link from "next/link";
import { notFound } from "next/navigation";
import { StorePagination } from "@/components/storefront/store-pagination";
import { StorefrontProductGrid } from "@/components/storefront/storefront-product-grid";
import { BackIcon } from "@/components/ui/icons";
import { storeHref } from "@/lib/store-host";
import { storeBasePath } from "@/lib/store-links";
import { getStorefrontStore } from "@/modules/catalog/service";
import { getRatingSummaries } from "@/modules/reviews/queries";
import { getStorefrontMerchandising, homeSectionPageSize, pageSlice, readPage } from "@/modules/storefront/merchandising";

export async function generateMetadata({ params }: PageProps<"/[slug]/promotions">) {
  const { slug } = await params;
  const store = await getStorefrontStore(slug);
  return { title: store ? `Promotions · ${store.name}` : "Promotions" };
}

/** Tous les produits en promotion, de la plus forte réduction à la plus faible. */
export default async function StorePromotionsPage({ params, searchParams }: PageProps<"/[slug]/promotions">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const store = await getStorefrontStore(slug);
  if (!store) notFound();
  const [merchandising, ratings, base] = await Promise.all([
    getStorefrontMerchandising(store.id),
    store.reviewsEnabled ? getRatingSummaries(store.id) : null,
    storeBasePath(store.slug),
  ]);
  const promotions = merchandising.promotions;
  const page = readPage(query.page, promotions.length);
  const listHref = storeHref(base, "promotions");

  return (
    <main className="sf-home sf-promotions">
      <div className="sf-page-head sf-home-page-head">
        <Link aria-label="Retour à la boutique" className="sf-back" href={storeHref(base)}><BackIcon size={18} /></Link>
        <h1>Promotions</h1>
      </div>
      {promotions.length ? (
        <section aria-label="Produits en promotion" className="sf-home-section">
          <p className="sf-home-section-lead">
            {promotions.length} produit{promotions.length > 1 ? "s" : ""} à prix réduit, des plus fortes réductions aux plus petites. Profitez-en !
          </p>
          <StorefrontProductGrid base={base} discountBadge products={pageSlice(promotions, page)} ratings={ratings} />
          <StorePagination
            href={(value) => (value > 1 ? `${listHref}?page=${value}` : listHref)}
            label="Promotions"
            page={page}
            pages={Math.ceil(promotions.length / homeSectionPageSize)}
          />
        </section>
      ) : (
        <section className="sf-empty">
          <h2>Aucune promotion en ce moment</h2>
          <p>Revenez bientôt : les bonnes affaires arrivent vite. En attendant, découvrez tout le catalogue.</p>
          <Link className="sf-btn sf-btn-primary" href={storeHref(base)}>Voir tous les produits</Link>
        </section>
      )}
    </main>
  );
}
