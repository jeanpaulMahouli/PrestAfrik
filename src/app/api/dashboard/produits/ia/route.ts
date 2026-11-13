import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { mediaPathPattern, photoVariant } from "@/lib/product-photos";
import { maxAiPhotos, ProductAiError, productAiAvailable, suggestProductDetails } from "@/lib/product-ai";
import { createRateLimiter } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/request-guards";
import { storage } from "@/lib/storage";
import { formatDate } from "@/lib/format";
import { getAiCredits, refundAiCredit, takeAiCredit, type AiCredits } from "@/modules/ai-credits/server";
import { auth } from "@/modules/auth/server";
import { hasPermission } from "@/modules/auth/permissions";
import { getStoreContext } from "@/modules/stores/context";

export const runtime = "nodejs";
export const maxDuration = 60;

// Assistant IA du formulaire produit : propose un nom et une description à partir des photos.
// Crédits : 5 demandes offertes par mois et par boutique (modules/ai-credits), et au plus 10 par heure.
const limiter = createRateLimiter({ limit: 10, windowMs: 60 * 60_000 });

const bodySchema = z.object({
  photos: z.array(z.string().max(300)).max(5),
  name: z.string().max(200).default(""),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requête refusée." }, { status: 403 });
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
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

  // 1 crédit par demande (5 offerts chaque mois, puis les bonus de l'administration) ; rendu si l'IA échoue.
  const ticket = await takeAiCredit(store.id, session.user.id);
  if (!ticket) {
    const credits = await getAiCredits(store.id);
    return NextResponse.json(
      { error: `Vous avez utilisé tous vos crédits IA ce mois-ci. Ils reviennent le ${formatDate(credits.renewsAt)} ; vous pouvez aussi demander des crédits à l’équipe PrestAfrik.`, credits: creditsPayload(credits) },
      { status: 402 },
    );
  }

  try {
    const suggestion = await suggestProductDetails(images, parsed.data.name);
    return NextResponse.json({ ...suggestion, credits: creditsPayload(await getAiCredits(store.id)) });
  } catch (error) {
    await refundAiCredit(store.id, ticket);
    if (error instanceof ProductAiError) return NextResponse.json({ error: error.message }, { status: 502 });
    throw error;
  }
}

/** Solde envoyé au navigateur (affiché sous le bouton de l'assistant). */
function creditsPayload(credits: AiCredits) {
  return { total: credits.total, monthly: credits.monthly, bonus: credits.bonus, allowance: credits.allowance, renewsAt: credits.renewsAt.toISOString() };
}
