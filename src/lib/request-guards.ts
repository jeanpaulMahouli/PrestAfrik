import "server-only";

/**
 * Protection CSRF des Route Handlers qui modifient des données (brief §8) : l'en-tête Origin doit
 * correspondre à l'hôte de la requête (les Server Actions ont déjà cette vérification intégrée).
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
