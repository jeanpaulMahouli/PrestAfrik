// Formats d'affichage (brief §5.4). Montants XAF entiers, fuseau Africa/Douala.

export const timeZone = "Africa/Douala";

const amountFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** `28 500 FCFA` ; `null` signifie un montant encore à confirmer. */
export function formatFcfa(amountXaf: number | null | undefined, unknown = "À confirmer") {
  if (amountXaf === null || amountXaf === undefined) return unknown;
  return `${formatNumber(amountXaf)}\u00a0FCFA`;
}

// Intl produit une espace fine insécable (U+202F) qu'une partie des polices et des téléphones
// affichent mal ; on utilise l'espace insécable classique.
export function formatNumber(value: number) {
  return amountFormatter.format(value).replace(/\u202f/g, "\u00a0");
}

/** `11/10/2026` */
export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone }).format(date);
}

/** `14:02` */
export function formatTime(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone }).format(date);
}

/** `11/10/2026 à 14:02` */
export function formatDateTime(date: Date) {
  return `${formatDate(date)} à ${formatTime(date)}`;
}

/** Aujourd'hui → heure seule, sinon date courte. */
export function formatRelativeDay(date: Date, now = new Date()) {
  return formatDate(date) === formatDate(now) ? formatTime(date) : formatDate(date);
}

/** `#MB-1042` */
export function formatReference(reference: string) {
  return reference.startsWith("#") ? reference : `#${reference}`;
}

/** `+237 6 12 34 56 78` pour le Cameroun, groupage simple ailleurs. */
export function formatPhone(e164: string) {
  const digits = e164.replace(/\D/g, "");
  if (/^237\d{9}$/.test(digits)) {
    return `+237 ${digits[3]} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return `+${digits.replace(/(\d{3})(?=\d)/g, "$1 ")}`;
}

/** Numéro partiellement masqué : `+237 6•• •• •• 78`. */
export function maskPhone(e164: string) {
  const formatted = formatPhone(e164);
  const totalDigits = formatted.replace(/\D/g, "").length;
  let seen = 0;
  return [...formatted]
    .map((char) => {
      if (!/\d/.test(char)) return char;
      seen += 1;
      // Garde l'indicatif et le premier chiffre, puis les deux derniers.
      return seen <= 4 || seen > totalDigits - 2 ? char : "•";
    })
    .join("");
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}
