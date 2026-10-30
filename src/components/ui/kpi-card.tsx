import { ArrowDownRight, ArrowUpRight, Info, type LucideIcon } from "lucide-react";

export type KpiTone = "orange" | "navy" | "green" | "blue" | "violet";

/**
 * Chiffre clé : icône en haut (sans pastille), valeur, puis libellé avec à sa droite un « i » dont
 * l'info-bulle explique le chiffre. L'évolution est comparée à la période précédente (flèche + signe).
 */
export function KpiCard({
  icon: Icon,
  tone = "orange",
  label,
  value,
  evolution,
  comparison = "vs période précédente",
  hint,
  info,
}: {
  icon: LucideIcon;
  tone?: KpiTone;
  label: string;
  value: string;
  /** Évolution en % ; null = rien à comparer (période précédente vide) ; absent = pas d'évolution. */
  evolution?: number | null;
  comparison?: string;
  hint?: string;
  /** Explication affichée dans l'info-bulle du « i ». */
  info?: string;
}) {
  return (
    <article className="kpi-card">
      <Icon aria-hidden="true" className={`kpi-icon kpi-icon-${tone}`} size={26} strokeWidth={1.8} />
      <p className="kpi-value">{value}</p>
      <div className="kpi-label-row">
        <p className="kpi-label">{label}</p>
        {info && (
          <span className="kpi-info">
            <button aria-label={`À propos de « ${label} » : ${info}`} className="kpi-info-button" type="button">
              <Info aria-hidden="true" size={16} />
            </button>
            <span aria-hidden="true" className="kpi-info-tip" role="tooltip">
              {info}
            </span>
          </span>
        )}
      </div>
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
    </article>
  );
}
