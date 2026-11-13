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
  const allowance = `Vous avez droit à ${credits.allowance} crédit${plural(credits.allowance)} IA tous les mois${credits.bonus > 0 ? `, plus ${credits.bonus} crédit${plural(credits.bonus)} bonus` : ""}.`;
  return (
    <section aria-label="Crédits de l’assistant IA" className={`ai-credits-card${empty ? " is-empty" : ""}${compact ? " is-compact" : ""}`}>
      <Sparkles aria-hidden="true" className="ai-credits-card-icon" size={compact ? 26 : 32} />
      <div className="ai-credits-card-body">
        <p className="ai-credits-card-title">
          <strong>{credits.total}</strong> crédit{plural(credits.total)} IA restant{plural(credits.total)}
        </p>
        {empty ? (
          <p className="ai-credits-card-detail">Vos crédits reviennent le {renewal(credits.renewsAt)}. Besoin de plus ? Demandez des crédits à l’équipe PrestAfrik.</p>
        ) : (
          !compact && <p className="ai-credits-card-detail">Laissez l’IA vous proposer un nom précis et une description claire et vendeuse, à partir des photos de votre produit.</p>
        )}
        <p className="ai-credits-card-help">{allowance}</p>
      </div>
      {action && !empty && (
        <Link className="ai-credits-card-action" href={action.href}>
          {action.label}
        </Link>
      )}
    </section>
  );
}
