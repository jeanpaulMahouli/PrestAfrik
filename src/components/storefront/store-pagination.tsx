import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

/** Numéros de page affichés : la première, la dernière et les voisines de la page courante. */
function visiblePages(page: number, pages: number) {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((value) => value >= 1 && value <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  sorted.forEach((value, position) => {
    if (position > 0 && value - sorted[position - 1] > 1) result.push("…");
    result.push(value);
  });
  return result;
}

/** Pagination d'une section de la vitrine ; l'adresse garde la page de chaque section (?featured=2&top=3). */
export function StorePagination({ label, page, pages, href }: { label: string; page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label={`Pages : ${label}`} className="sf-pagination">
      {page > 1 ? (
        <Link aria-label="Page précédente" className="sf-page-step" href={href(page - 1)} rel="prev" scroll={false}>
          <ChevronLeft aria-hidden="true" size={18} />
          <span>Précédent</span>
        </Link>
      ) : (
        <span aria-disabled="true" className="sf-page-step">
          <ChevronLeft aria-hidden="true" size={18} />
          <span>Précédent</span>
        </span>
      )}
      <ol>
        {visiblePages(page, pages).map((value, position) =>
          value === "…" ? (
            <li aria-hidden="true" key={`gap-${position}`}>…</li>
          ) : (
            <li key={value}>
              <Link aria-current={value === page ? "page" : undefined} aria-label={`Page ${value}`} href={href(value)} scroll={false}>
                {value}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < pages ? (
        <Link aria-label="Page suivante" className="sf-page-step" href={href(page + 1)} rel="next" scroll={false}>
          <span>Suivant</span>
          <ChevronRight aria-hidden="true" size={18} />
        </Link>
      ) : (
        <span aria-disabled="true" className="sf-page-step">
          <span>Suivant</span>
          <ChevronRight aria-hidden="true" size={18} />
        </span>
      )}
    </nav>
  );
}
