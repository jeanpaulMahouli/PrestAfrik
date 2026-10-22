"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { StarRating, reviewCountLabel } from "@/components/storefront/star-rating";
import { submitReview, type ReviewFormState } from "@/modules/reviews/actions";

type Review = { id: string; authorName: string; rating: number; comment: string; createdAt: string };

const ratingWords = ["", "Décevant", "Moyen", "Bien", "Très bien", "Excellent"];

/** Section « Avis clients » de la fiche produit : synthèse, avis publiés et formulaire (avis publié aussitôt). */
export function ProductReviews({ productId, reviews, summary }: { productId: string; reviews: Review[]; summary: { average: number; count: number } }) {
  const [state, action, pending] = useActionState<ReviewFormState, FormData>(submitReview, null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const shown = hover || rating;
  const fieldError = (field: string) => (state && !state.ok && state.field === field ? state.message : null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setRating(0);
      setOpen(false);
    }
  }, [state]);

  return (
    <section aria-labelledby="sf-reviews-title" className="sf-section sf-reviews">
      <div className="sf-section-head">
        <h2 id="sf-reviews-title">Avis clients</h2>
        <div className="sf-reviews-summary">
          <StarRating size={20} value={summary.average} />
          <span>
            {summary.count > 0 && <strong>{summary.average.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/5 · </strong>}
            {reviewCountLabel(summary.count)}
          </span>
        </div>
      </div>

      {state?.ok && (
        <p className="sf-notice sf-notice-success" role="status">
          {state.message}
        </p>
      )}

      {!open ? (
        <button className="sf-btn sf-btn-secondary" onClick={() => setOpen(true)} type="button">
          Donner mon avis
        </button>
      ) : (
        <form action={action} className="sf-form sf-review-form" ref={formRef}>
          <input name="productId" type="hidden" value={productId} />
          <input name="rating" type="hidden" value={rating || ""} />
          <fieldset className="sf-field">
            <legend>Votre note</legend>
            <div className="sf-star-picker" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  aria-label={`${value} étoile${value > 1 ? "s" : ""} : ${ratingWords[value]}`}
                  aria-pressed={rating === value}
                  className={value <= shown ? "is-on" : ""}
                  key={value}
                  onClick={() => setRating(value)}
                  onFocus={() => setHover(value)}
                  onBlur={() => setHover(0)}
                  onMouseEnter={() => setHover(value)}
                  type="button"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M12 2.5l2.94 6.06 6.56.92-4.78 4.6 1.17 6.52L12 17.5l-5.89 3.1 1.17-6.52-4.78-4.6 6.56-.92L12 2.5z" />
                  </svg>
                </button>
              ))}
              <span aria-live="polite" className="sf-star-picker-word">{ratingWords[shown]}</span>
            </div>
            {fieldError("rating") && <span className="sf-field-error">{fieldError("rating")}</span>}
          </fieldset>
          <label className="sf-field">
            Votre prénom
            <input aria-invalid={fieldError("authorName") ? true : undefined} autoComplete="given-name" maxLength={60} name="authorName" placeholder="Ex. Estelle" required />
            {fieldError("authorName") && <span className="sf-field-error">{fieldError("authorName")}</span>}
          </label>
          <label className="sf-field">
            Votre avis
            <textarea aria-invalid={fieldError("comment") ? true : undefined} maxLength={1000} name="comment" placeholder="Qualité, livraison, conformité aux photos…" required rows={4} />
            {fieldError("comment") && <span className="sf-field-error">{fieldError("comment")}</span>}
          </label>
          {/* Champ piège pour les robots : invisible et ignoré par les lecteurs d'écran. */}
          <div aria-hidden="true" className="sf-trap">
            <input autoComplete="off" name="website" tabIndex={-1} />
          </div>
          {state && !state.ok && !state.field && (
            <p className="sf-notice sf-notice-error" role="alert">
              {state.message}
            </p>
          )}
          <div className="sf-review-actions">
            <button className="sf-btn sf-btn-primary" disabled={pending || rating === 0} type="submit">
              {pending ? "Envoi…" : "Publier mon avis"}
            </button>
            <button className="sf-btn sf-btn-secondary" onClick={() => setOpen(false)} type="button">
              Annuler
            </button>
          </div>
        </form>
      )}

      {reviews.length > 0 ? (
        <ul className="sf-review-list">
          {reviews.map((review) => (
            <li className="sf-review" key={review.id}>
              <div className="sf-review-head">
                <span aria-hidden="true" className="sf-review-avatar">
                  {review.authorName.trim()[0]?.toLocaleUpperCase("fr-FR")}
                </span>
                <div>
                  <strong>{review.authorName}</strong>
                  <time dateTime={review.createdAt}>{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(review.createdAt))}</time>
                </div>
                <StarRating value={review.rating} />
              </div>
              <p>{review.comment}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sf-muted">Soyez le premier à donner votre avis sur ce produit.</p>
      )}
    </section>
  );
}
