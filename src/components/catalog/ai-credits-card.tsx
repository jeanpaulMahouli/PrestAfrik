import Link from "next/link";
import { Sparkles } from "@/components/ui/icons";

/** Crédits IA restants de la boutique (5 par mois, puis les bonus de l'administration). */
export type AiCreditsSummary = { total: number; monthly: number; bonus: number; allowance: number; renewsAt: string };

const renewal = (iso: string) => {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: "Africa/Douala" }).format(date);
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "Africa/Douala" }).format(date);
  return `${day === "1" ? "1er" : day} ${month}`;
};

const plural = (count: number) => (count > 1 ? "s" : "");

/**
 * Encart « Crédits IA », bien visible : tableau de bord (accueil) et « Infos pratiques » du formulaire produit.
 * Composant sans état : utilisable côté serveur comme côté navigateur.
 */
export function AiCreditsCard({ credits, action, compact = false }: { credits: AiCreditsSummary; /** Lien vers l'ajout d'un produit (tableau de bord). */ action?: { href: string; label: string }; compact?: boolean }) {
  const empty = credits.total <= 0;
  return (
    <section aria-label="Crédits de l’assistant IA" className={`ai-credits-card${empty ? " is-empty" : ""}${compact ? " is-compact" : ""}`}>
      <span aria-hidden="true" className="ai-credits-card-icon">
        <Sparkles size={compact ? 20 : 24} weight="fill" />
      </span>
      <div className="ai-credits-card-body">
        <p className="ai-credits-card-title">
          <strong>{credits.total}</strong> crédit{plural(credits.total)} IA restant{plural(credits.total)}
        </p>
        <p className="ai-credits-card-detail">
          {empty
            ? `Ils reviennent le ${renewal(credits.renewsAt)}. Besoin de plus ? Demandez des crédits à l’équipe PrestAfrik.`
            : `${credits.monthly} sur ${credits.allowance} ce mois-ci${credits.bonus > 0 ? ` + ${credits.bonus} bonus` : ""} · renouvelés le ${renewal(credits.renewsAt)}`}
        </p>
        {!compact && <p className="ai-credits-card-help">1 crédit = 1 proposition de nom et de description à partir de vos photos.</p>}
      </div>
      {action && !empty && (
        <Link className="ai-credits-card-action" href={action.href}>
          {action.label}
        </Link>
      )}
    </section>
  );
}
