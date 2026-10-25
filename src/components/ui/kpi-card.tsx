import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

export type KpiTone = "orange" | "navy" | "green" | "blue" | "violet";

/**
 * Chiffre clé : icône dans un cercle coloré à gauche ; libellé, valeur et évolution à droite.
 * L'évolution est comparée à la période précédente (flèche + signe : jamais la couleur seule).
 */
export function KpiCard({
  icon: Icon,
  tone = "orange",
  label,
  value,
  evolution,
  comparison = "vs période précédente",
  hint,
}: {
  icon: LucideIcon;
  tone?: KpiTone;
  label: string;
  value: string;
  /** Évolution en % ; null = rien à comparer (période précédente vide) ; absent = pas d'évolution. */
  evolution?: number | null;
  comparison?: string;
  hint?: string;
}) {
  return (
    <article className="kpi-card">
      <span aria-hidden="true" className={`kpi-icon kpi-icon-${tone}`}>
        <Icon size={22} strokeWidth={2} />
      </span>
      <div className="kpi-text">
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{value}</p>
        {evolution !== undefined && (
          <p className="kpi-evolution">
            {evolution === null ? (
              <span className="kpi-delta kpi-delta-new">Nouveau</span>
            ) : evolution === 0 ? (
              <span className="kpi-delta">= 0 %</span>
            ) : (
              <span className={`kpi-delta ${evolution > 0 ? "kpi-delta-up" : "kpi-delta-down"}`}>
                {evolution > 0 ? <ArrowUpRight aria-hidden="true" size={14} /> : <ArrowDownRight aria-hidden="true" size={14} />}
                {evolution > 0 ? "+" : "−"}
                {Math.abs(evolution)} %
              </span>
            )}
            <span className="kpi-comparison">{comparison}</span>
          </p>
        )}
        {hint && <p className="kpi-comparison">{hint}</p>}
      </div>
    </article>
  );
}
