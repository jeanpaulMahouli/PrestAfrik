import Link from "next/link";
import { StarRating } from "@/components/storefront/star-rating";
import { VendorShell } from "@/components/layout/vendor-shell";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { moderateReview, setReviewsEnabled } from "@/modules/reviews/actions";
import { requireStorePermission } from "@/modules/stores/context";

export const metadata = { title: "Avis clients" };

// Les avis sont publiés dès leur dépôt ; le vendeur peut les retirer. « En attente » ne concerne que d'anciens avis.
const tabs = { publies: { label: "Publiés", status: "APPROVED" }, retires: { label: "Retirés", status: "REJECTED" }, attente: { label: "En attente", status: "PENDING" } } as const;
type Tab = keyof typeof tabs;

export default async function ReviewsPage({ searchParams }: PageProps<"/dashboard/avis">) {
  const { store } = await requireStorePermission("products.manage");
  const params = await searchParams;
  const tab: Tab = typeof params.onglet === "string" && Object.hasOwn(tabs, params.onglet) ? (params.onglet as Tab) : "publies";
  const [counts, reviews, stats] = await Promise.all([
    prisma.productReview.groupBy({ by: ["status"], where: { storeId: store.id }, _count: { _all: true } }),
    prisma.productReview.findMany({
      where: { storeId: store.id, status: tabs[tab].status },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, authorName: true, rating: true, comment: true, createdAt: true, product: { select: { name: true, slug: true } } },
    }),
    prisma.productReview.aggregate({ where: { storeId: store.id, status: "APPROVED" }, _avg: { rating: true } }),
  ]);
  const count = (status: string) => counts.find((row) => row.status === status)?._count._all ?? 0;
  const average = stats._avg.rating ?? 0;

  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Avis clients</h1>
          <p className="v-page-subtitle">Vos clients notent vos produits. Leurs avis sont publiés aussitôt ; vous pouvez retirer ceux qui ne conviennent pas.</p>
        </div>
      </div>

      <section className="v-card reviews-settings">
        <div>
          <h2 className="v-card-title">Avis sur la boutique</h2>
          <p className="v-muted">
            {store.reviewsEnabled
              ? "Activés : les étoiles et les avis publiés s’affichent sur vos fiches produit, et vos clients peuvent en laisser."
              : "Désactivés : aucune étoile ni aucun avis n’est affiché, et vos clients ne peuvent plus en laisser. Les avis existants sont conservés."}
          </p>
          {count("APPROVED") > 0 && (
            <p className="reviews-average">
              <StarRating size={18} value={average} /> {average.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/5 sur {count("APPROVED")} avis publiés
            </p>
          )}
        </div>
        <form action={setReviewsEnabled}>
          <input name="enabled" type="hidden" value={store.reviewsEnabled ? "false" : "true"} />
          <SubmitButton className={store.reviewsEnabled ? "btn btn-secondary" : "btn btn-primary"} pendingLabel="Enregistrement…">
            {store.reviewsEnabled ? "Désactiver les avis" : "Activer les avis"}
          </SubmitButton>
        </form>
      </section>

      <nav aria-label="Filtrer les avis" className="pill-tabs">
        {(Object.keys(tabs) as Tab[]).filter((key) => key !== "attente" || count("PENDING") > 0 || tab === "attente").map((key) => (
          <Link aria-current={tab === key ? "page" : undefined} href={key === "publies" ? "/dashboard/avis" : `/dashboard/avis?onglet=${key}`} key={key}>
            {tabs[key].label} ({count(tabs[key].status)})
          </Link>
        ))}
      </nav>

      {reviews.length ? (
        <ul className="reviews-list">
          {reviews.map((review) => (
            <li className="v-card review-item" key={review.id}>
              <div className="review-item-head">
                <div>
                  <strong>{review.authorName}</strong>
                  <span className="v-muted v-small"> · {formatDateTime(review.createdAt)}</span>
                </div>
                <StarRating value={review.rating} />
              </div>
              <p className="review-item-product">
                Sur <a href={`/${store.slug}/${review.product.slug}`} rel="noopener noreferrer" target="_blank">{review.product.name}</a>
              </p>
              <p className="review-item-comment">{review.comment}</p>
              <div className="review-item-actions">
                {tab !== "publies" && (
                  <form action={moderateReview}>
                    <input name="reviewId" type="hidden" value={review.id} />
                    <input name="decision" type="hidden" value="APPROVED" />
                    <SubmitButton className="btn btn-primary btn-sm" pendingLabel="…">{tab === "retires" ? "Republier" : "Publier"}</SubmitButton>
                  </form>
                )}
                {tab !== "retires" && (
                  <form action={moderateReview}>
                    <input name="reviewId" type="hidden" value={review.id} />
                    <input name="decision" type="hidden" value="REJECTED" />
                    <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="…">Retirer</SubmitButton>
                  </form>
                )}
                {tab === "retires" && (
                  <form action={moderateReview}>
                    <input name="reviewId" type="hidden" value={review.id} />
                    <input name="decision" type="hidden" value="delete" />
                    <SubmitButton className="btn btn-danger-outline btn-sm" pendingLabel="…">Supprimer</SubmitButton>
                  </form>
                )}
                {tab === "attente" && <Badge tone="warning">En attente de validation</Badge>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="v-card v-empty">
          <h2>{tab === "publies" ? "Aucun avis pour le moment" : tab === "retires" ? "Aucun avis retiré" : "Aucun avis en attente"}</h2>
          <p>{tab === "publies" ? "Les avis de vos clients apparaîtront ici dès qu’ils seront déposés sur vos fiches produit." : "Les avis que vous retirez de votre boutique apparaissent ici."}</p>
        </div>
      )}
    </VendorShell>
  );
}
