import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { getShopScope } from "@/modules/marketplace/country";
import { exploreShop } from "@/modules/marketplace/shop";

// Suggestions de produits de la barre de recherche de la marketplace, pendant la saisie (recherche
// tolérante, dans l'univers et la ville du visiteur). 60 requêtes par minute et par adresse IP.
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export async function GET(request: Request) {
  if (!limiter.consume(clientIp(request)).allowed) return Response.json({ suggestions: [] }, { status: 429 });
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return Response.json({ suggestions: [] });
  const scope = await getShopScope();
  const { products } = await exploreShop({ q }, scope);
  const suggestions = products.slice(0, 5).map((product) => ({
    id: product.id,
    name: product.name,
    href: product.href,
    priceXaf: product.priceXaf,
    imageUrl: product.imageUrl,
    store: product.store.name,
  }));
  return Response.json({ suggestions });
}
