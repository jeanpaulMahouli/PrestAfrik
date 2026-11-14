import { prisma } from "@/lib/prisma";
import { photoVariant } from "@/lib/product-photos";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { getPublishedProducts } from "@/modules/catalog/service";

// Suggestions de la recherche d'une vitrine publique, pendant la saisie (recherche tolérante : fautes,
// pluriels, débuts de mots). Public : boutiques en ligne seulement, 90 requêtes par minute et par IP.
const limiter = createRateLimiter({ limit: 90, windowMs: 60_000 });

export async function GET(request: Request, { params }: RouteContext<"/api/boutique/[slug]/recherche">) {
  const { slug } = await params;
  if (!limiter.consume(clientIp(request)).allowed) return Response.json({ suggestions: [] }, { status: 429 });
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2 || !/^[a-z0-9-]{1,60}$/.test(slug)) return Response.json({ suggestions: [] });
  const store = await prisma.store.findFirst({ where: { slug, isPublished: true, suspendedAt: null }, select: { id: true } });
  if (!store) return Response.json({ suggestions: [] });
  const products = await getPublishedProducts(store.id, { query: q });
  const suggestions = products.slice(0, 6).map((product) => ({
    name: product.name,
    slug: product.slug,
    priceXaf: product.promotionalPriceXaf ?? product.priceXaf,
    imageUrl: product.images[0] ? photoVariant(product.images[0].url, 320) : null,
  }));
  return Response.json({ suggestions, total: products.length }, { headers: { "Cache-Control": "public, max-age=30" } });
}
