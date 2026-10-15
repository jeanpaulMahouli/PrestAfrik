import Link from "next/link";
import { BackIcon } from "@/components/ui/icons";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  /** Construit l'adresse d'une page en conservant les autres filtres. */
  href: (page: number) => string;
};

export function Pagination({ page, pageSize, total, href }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  return (
    <nav aria-label="Pagination" className="pagination">
      <p>
        {first}–{last} sur {total}
      </p>
      <div>
        {page > 1 ? (
          <Link className="btn btn-secondary btn-sm" href={href(page - 1)} rel="prev">
            <BackIcon size={12} /> Précédent
          </Link>
        ) : (
          <span aria-disabled="true" className="btn btn-secondary btn-sm"><BackIcon size={12} /> Précédent</span>
        )}
        <span className="pagination-current">
          Page {page} sur {pages}
        </span>
        {page < pages ? (
          <Link className="btn btn-secondary btn-sm" href={href(page + 1)} rel="next">
            Suivant →
          </Link>
        ) : (
          <span aria-disabled="true" className="btn btn-secondary btn-sm">Suivant →</span>
        )}
      </div>
    </nav>
  );
}
