/** Adresse IP du client derrière le proxy (première valeur de x-forwarded-for). */
export function clientIpFrom(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
