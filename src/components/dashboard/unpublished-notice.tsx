import { ArrowRight, Check, Eye, Rocket, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import type { PublicationItem } from "@/modules/stores/publication";
import { publishStore } from "@/modules/stores/settings-actions";

/**
 * Accueil du tableau de bord, boutique pas encore publiée : alerte en tête de page, étapes restantes
 * (chacune mène à la page où la faire), et bouton « Publier ma boutique » dès que tout est prêt.
 * Tant qu'elle n'est pas publiée, la boutique n'est visible ni des clients ni sur la marketplace.
 */
export function UnpublishedNotice({ checklist, previewHref, canPublish }: { checklist: PublicationItem[]; previewHref: string; canPublish: boolean }) {
  const missing = checklist.filter((item) => !item.done);
  const done = checklist.length - missing.length;
  const ready = missing.length === 0;
  return (
    <section aria-labelledby="publication-title" className="v-card unpublished-notice" role="status">
      <header className="unpublished-head">
        <span aria-hidden="true" className="unpublished-icon">
          {ready ? <Rocket size={26} /> : <TriangleAlert size={26} />}
        </span>
        <div>
          <h2 id="publication-title">{ready ? "Votre boutique est prête à être publiée" : "Votre boutique n’est pas encore en ligne"}</h2>
          <p>
            {ready
              ? "Tout est prêt : publiez-la pour que vos clients la voient et qu’elle apparaisse sur la marketplace PrestAfrik."
              : `Vos clients ne la voient pas encore, et elle n’apparaît pas sur la marketplace. Il reste ${missing.length} étape${missing.length > 1 ? "s" : ""} (${done} sur ${checklist.length} terminées).`}
          </p>
        </div>
      </header>
      <div aria-hidden="true" className="unpublished-progress">
        <span style={{ width: `${Math.round((done / Math.max(1, checklist.length)) * 100)}%` }} />
      </div>
      <ol className="unpublished-steps">
        {checklist.map((item) => (
          <li className={item.done ? "is-done" : undefined} key={item.key}>
            <span aria-hidden="true" className="unpublished-check">
              {item.done ? <Check size={14} strokeWidth={3} /> : null}
            </span>
            {item.done ? (
              <span>{item.label}</span>
            ) : (
              <Link href={item.href}>
                {item.label} <ArrowRight aria-hidden="true" size={16} />
              </Link>
            )}
            <span className="visually-hidden">{item.done ? " : fait" : " : à faire"}</span>
          </li>
        ))}
      </ol>
      <div className="unpublished-actions">
        {ready && canPublish ? (
          <form action={publishStore}>
            <SubmitButton className="btn btn-primary" pendingLabel="Publication…">
              <Rocket aria-hidden="true" size={18} /> Publier ma boutique
            </SubmitButton>
          </form>
        ) : missing[0] ? (
          <Link className="btn btn-primary" href={missing[0].href}>
            Étape suivante : {missing[0].label.toLowerCase()} <ArrowRight aria-hidden="true" size={18} />
          </Link>
        ) : null}
        <Link className="btn btn-secondary" href={previewHref}>
          <Eye aria-hidden="true" size={18} /> Voir l’aperçu
        </Link>
      </div>
      {ready && !canPublish && <p className="v-muted">Seul le propriétaire ou un administrateur de la boutique peut la publier.</p>}
    </section>
  );
}
