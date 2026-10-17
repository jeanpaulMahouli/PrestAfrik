import { DismissibleDetails } from "@/components/ui/dismissible-details";
import { periodKeys, periodLabels, type PeriodRange } from "@/lib/periods";

/** Filtre de période (Aujourd'hui, 7 derniers jours, Mois en cours, Période personnalisée). */
export function PeriodFilter({ basePath, period }: { basePath: string; period: PeriodRange }) {
  return (
    <DismissibleDetails className="period-filter">
      <summary className="btn btn-secondary">
        {period.label} <span aria-hidden="true">▾</span>
      </summary>
      <div className="period-filter-panel">
        <ul>
          {periodKeys
            .filter((key) => key !== "personnalisee")
            .map((key) => (
              <li key={key}>
                <a aria-current={period.key === key ? "true" : undefined} href={`${basePath}?periode=${key}`}>
                  {periodLabels[key]}
                </a>
              </li>
            ))}
        </ul>
        <form action={basePath} className="period-filter-custom">
          <input name="periode" type="hidden" value="personnalisee" />
          <p>{periodLabels.personnalisee}</p>
          <label>
            Du
            <input defaultValue={period.fromInput} name="du" required type="date" />
          </label>
          <label>
            Au
            <input defaultValue={period.toInput} name="au" required type="date" />
          </label>
          <button className="btn btn-primary btn-sm" type="submit">
            Appliquer
          </button>
        </form>
      </div>
    </DismissibleDetails>
  );
}
