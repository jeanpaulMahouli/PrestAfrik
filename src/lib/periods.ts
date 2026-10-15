// Périodes des filtres (brief §6.9) : bornes calculées dans le fuseau Africa/Douala (UTC+1, sans heure d'été).

export const periodKeys = ["aujourdhui", "7-jours", "mois", "personnalisee"] as const;
export type PeriodKey = (typeof periodKeys)[number];

export const periodLabels: Record<PeriodKey, string> = {
  aujourdhui: "Aujourd’hui",
  "7-jours": "7 derniers jours",
  mois: "Mois en cours",
  personnalisee: "Période personnalisée",
};

const offsetMs = 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

/** Minuit (heure de Douala) du jour contenant `date`, exprimé en UTC. */
export function startOfDoualaDay(date: Date) {
  const local = new Date(date.getTime() + offsetMs);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - offsetMs);
}

function parseLocalDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : new Date(date.getTime() - offsetMs);
}

export type PeriodRange = { key: PeriodKey; from: Date; to: Date; label: string; fromInput: string; toInput: string };

const inputValue = (date: Date) => new Date(date.getTime() + offsetMs).toISOString().slice(0, 10);

export function resolvePeriod(
  params: { periode?: string; du?: string; au?: string },
  now = new Date(),
): PeriodRange {
  const key = (periodKeys as readonly string[]).includes(params.periode ?? "") ? (params.periode as PeriodKey) : "aujourdhui";
  const todayStart = startOfDoualaDay(now);
  let from = todayStart;
  let to = new Date(todayStart.getTime() + dayMs);

  if (key === "7-jours") from = new Date(todayStart.getTime() - 6 * dayMs);
  if (key === "mois") {
    const local = new Date(now.getTime() + offsetMs);
    from = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - offsetMs);
  }
  if (key === "personnalisee") {
    const start = parseLocalDate(params.du) ?? todayStart;
    const end = parseLocalDate(params.au) ?? todayStart;
    const [low, high] = start <= end ? [start, end] : [end, start];
    // Au plus un an, pour garder des requêtes raisonnables.
    from = high.getTime() - low.getTime() > 366 * dayMs ? new Date(high.getTime() - 366 * dayMs) : low;
    to = new Date(high.getTime() + dayMs);
  }

  const label =
    key === "personnalisee"
      ? `Du ${inputValue(from).split("-").reverse().join("/")} au ${inputValue(new Date(to.getTime() - dayMs)).split("-").reverse().join("/")}`
      : periodLabels[key];
  return { key, from, to, label, fromInput: inputValue(from), toInput: inputValue(new Date(to.getTime() - dayMs)) };
}
