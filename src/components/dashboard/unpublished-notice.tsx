import { ArrowRight, Eye, ListChecks, Rocket } from "lucide-react";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import type { PublicationItem } from "@/modules/stores/publication";
import { publishStore } from "@/modules/stores/settings-actions";

/**
 * Accueil du tableau de bord, boutique pas encore publiée : ce qui reste à faire (titre court, barre de
 * progression, étapes restantes seulement) et une seule action principale : l'étape suivante, ou
 * « Publier ma boutique » dès que tout est prêt.
 */
export function UnpublishedNotice({ checklist, previewHref, canPublish }: { checklist: PublicationItem[]; previewHref: string; canPublish: boolean }) {
  const missing = checklist.filter((item) => !item.done);
  const done = checklist.length - missing.length;
  const ready = missing.length === 0;
  const percent = Math.round((done / Math.max(1, checklist.length)) * 100);
  const title = ready ? "Votre boutique est prête" : missing.length === 1 ? "Plus qu’une étape avant la mise en ligne" : `Encore ${missing.length} étapes avant la mise en ligne`;

  return (
    <section aria-labelledby="publication-title" className={`v-card unpublished-notice${ready ? " is-ready" : ""}`} role="status">
      <header className="unpublished-head">
        <span aria-hidden="true" className="unpublished-icon">
          {ready ? <Rocket size={24} /> : <ListChecks size={24} />}
        </span>
        <div>
          <h2 id="publication-title">{title}</h2>
          <p>{ready ? "Publiez-la pour recevoir vos premières commandes." : "Vos clients la verront dès sa publication."}</p>
        </div>
      </header>

      <div className="unpublished-meter">
        <div aria-hidden="true" className="unpublished-progress">
          <span style={{ width: `${percent}%` }} />
        </div>
        <span className="unpublished-count">
          {done}/{checklist.length}
        </span>
      </div>

      {/* Les étapes restantes ; avec une seule, le bouton principal suffit. */}
      {missing.length > 1 && (
        <ol className="unpublished-steps">
          {missing.map((item) => (
            <li key={item.key}>
              <Link href={item.href}>
                {item.label} <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </li>
          ))}
        </ol>
      )}

      <div className="unpublished-actions">
        {ready && canPublish ? (
          <form action={publishStore}>
            <SubmitButton className="btn btn-primary" pendingLabel="Publication…">
              <Rocket aria-hidden="true" size={18} /> Publier ma boutique
            </SubmitButton>
          </form>
        ) : missing[0] ? (
          <Link className="btn btn-primary" href={missing[0].href}>
            {missing[0].label} <ArrowRight aria-hidden="true" size={18} />
          </Link>
        ) : null}
        <Link className="btn btn-secondary" href={previewHref}>
          <Eye aria-hidden="true" size={18} /> Aperçu
        </Link>
      </div>
      {ready && !canPublish && <p className="v-muted">Seul le propriétaire peut publier.</p>}
    </section>
  );
}
