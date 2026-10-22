/** Bandeau de retour après une action d'administration (?succes=… ou ?erreur=…). */
export function AdminFeedback({ params }: { params: Record<string, string | string[] | undefined> }) {
  const success = typeof params.succes === "string" ? params.succes.slice(0, 200) : "";
  const error = typeof params.erreur === "string" ? params.erreur.slice(0, 200) : "";
  if (error) return <p className="v-banner v-banner-danger" role="alert">{error}</p>;
  if (success) return <p className="v-banner v-banner-success" role="status">{success}</p>;
  return null;
}

export function searchValue(params: Record<string, string | string[] | undefined>, key: string, max = 100) {
  const value = params[key];
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Adresse de la page courante (sans message), transmise aux actions pour y revenir. */
export function currentPath(pathname: string, params: Record<string, string | string[] | undefined>) {
  const copy = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value && key !== "succes" && key !== "erreur") copy.set(key, value);
  }
  const query = copy.toString();
  return query ? `${pathname}?${query}` : pathname;
}
