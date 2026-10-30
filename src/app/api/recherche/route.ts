import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { parseSearchQuery, suggestStores } from "@/modules/marketplace/search";

// Suggestions de la recherche de vendeurs (barre de l'accueil et de /recherche). Public : boutiques
// publiées seulement, champs publics seulement, 60 requêtes par minute et par adresse IP.
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export async function GET(request: Request) {
  const { allowed, retryAfterSeconds } = limiter.consume(clientIp(request));
  if (!allowed) {
    return Response.json({ error: "Trop de recherches d’affilée. Patientez quelques secondes." }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
  }
  const query = parseSearchQuery(new URL(request.url).searchParams.get("q"));
  if (!query) return Response.json({ suggestions: [] });
  const suggestions = await suggestStores(query);
  return Response.json({ suggestions }, { headers: { "Cache-Control": "public, max-age=30" } });
}
