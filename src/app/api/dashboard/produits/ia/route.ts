import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { mediaPathPattern, photoVariant } from "@/lib/product-photos";
import { maxAiPhotos, ProductAiError, productAiAvailable, suggestProductDetails } from "@/lib/product-ai";
import { createRateLimiter } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/request-guards";
import { storage } from "@/lib/storage";
import { auth } from "@/modules/auth/server";
import { hasPermission } from "@/modules/auth/permissions";
import { getStoreContext } from "@/modules/stores/context";

export const runtime = "nodejs";
export const maxDuration = 60;

// Assistant IA du formulaire produit : propose un nom et une description à partir des photos.
// 10 demandes par boutique et par heure : l'assistant est payant à l'usage.
const limiter = createRateLimiter({ limit: 10, windowMs: 60 * 60_000 });

const bodySchema = z.object({
  photos: z.array(z.string().max(300)).max(5),
  name: z.string().max(200).default(""),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requête refusée." }, { status: 403 });
  if (!(await auth.api.getSession({ headers: await headers() }))) {
    return NextResponse.json({ error: "Votre session a expiré. Reconnectez-vous pour continuer." }, { status: 401 });
  }
  const { store, membership } = await getStoreContext();
  if (!hasPermission(membership.role, "products.manage")) {
    return NextResponse.json({ error: "Vous n’avez pas l’autorisation de modifier le catalogue." }, { status: 403 });
  }
  if (!productAiAvailable()) {
    return NextResponse.json({ error: "L’assistant IA n’est pas encore activé sur PrestAfrik." }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande invalide." }, { status: 400 });

  // Seules les photos de cette boutique sont lues ; les 2 premières suffisent (la principale d'abord).
  const prefix = `stores/${store.id}/`;
  const keys = parsed.data.photos
    .map((url) => url.replace(/^\/media\//, ""))
    .filter((path) => mediaPathPattern.test(path) && path.startsWith(prefix))
    .slice(0, maxAiPhotos)
    .map((path) => photoVariant(path, 800));
  if (!keys.length) {
    return NextResponse.json({ error: "Ajoutez d’abord au moins une photo du produit, puis réessayez." }, { status: 422 });
  }

  const limit = limiter.consume(store.id);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Vous avez beaucoup utilisé l’assistant IA. Réessayez dans ${Math.ceil(limit.retryAfterSeconds / 60)} min.` },
      { status: 429 },
    );
  }

  const images = (await Promise.all(keys.map((key) => storage.get(key).catch(() => null)))).filter((image): image is Buffer => image !== null);
  if (!images.length) {
    return NextResponse.json({ error: "Les photos n’ont pas pu être lues. Ajoutez-les de nouveau." }, { status: 422 });
  }

  try {
    return NextResponse.json(await suggestProductDetails(images, parsed.data.name));
  } catch (error) {
    if (error instanceof ProductAiError) return NextResponse.json({ error: error.message }, { status: 502 });
    throw error;
  }
}
