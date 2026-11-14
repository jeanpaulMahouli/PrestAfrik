import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { mediaPathPattern, photoVariant } from "@/lib/product-photos";
import { maxAiPhotos, ProductAiError, productAiAvailable, suggestProductDetails } from "@/lib/product-ai";
import { createRateLimiter } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/request-guards";
import { storage } from "@/lib/storage";
import { auth } from "@/modules/auth/server";
import { isAccountVerified } from "@/modules/auth/phone-account";
import { findDraft, recordDraftAiUse } from "@/modules/stores/draft";

export const runtime = "nodejs";
export const maxDuration = 60;

// Assistant IA du premier produit, pendant la création de la boutique (?brouillon=…).
// Offert : rien n'est déduit des crédits du mois de la boutique (5/5 à son ouverture). Pour limiter les
// abus, au plus 3 propositions par brouillon et 5 par heure et par compte.
const limiter = createRateLimiter({ limit: 5, windowMs: 60 * 60_000 });
const wizardAiLimit = 3;

const bodySchema = z.object({
  photos: z.array(z.string().max(300)).max(5),
  name: z.string().max(200).default(""),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requête refusée." }, { status: 403 });
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Votre session a expiré. Reconnectez-vous pour continuer." }, { status: 401 });
  if (!isAccountVerified(session.user)) return NextResponse.json({ error: "Confirmez d’abord votre compte." }, { status: 403 });
  const draftId = new URL(request.url).searchParams.get("brouillon");
  const draft = await findDraft(session.user.id, draftId);
  if (!draft || draft.id !== draftId) {
    return NextResponse.json({ error: "Boutique en cours de création introuvable. Rechargez la page." }, { status: 404 });
  }
  if (!productAiAvailable()) return NextResponse.json({ error: "L’assistant IA n’est pas encore activé sur PrestAfrik." }, { status: 503 });

  const used = draft.data.aiUses ?? 0;
  if (used >= wizardAiLimit) {
    return NextResponse.json({ error: "Vous avez déjà essayé l’assistant IA plusieurs fois : remplissez le nom vous-même, vous pourrez réessayer depuis votre tableau de bord.", remaining: 0 }, { status: 402 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande invalide." }, { status: 400 });

  // Seules les photos provisoires de ce brouillon sont lues.
  const prefix = `stores/${draft.id}/tmp/`;
  const keys = parsed.data.photos
    .map((url) => url.replace(/^\/media\//, ""))
    .filter((path) => mediaPathPattern.test(path) && path.startsWith(prefix))
    .slice(0, maxAiPhotos)
    .map((path) => photoVariant(path, 800));
  if (!keys.length) return NextResponse.json({ error: "Ajoutez d’abord au moins une photo du produit, puis réessayez." }, { status: 422 });

  const limit = limiter.consume(session.user.id);
  if (!limit.allowed) {
    return NextResponse.json({ error: `Vous avez beaucoup utilisé l’assistant IA. Réessayez dans ${Math.ceil(limit.retryAfterSeconds / 60)} min.` }, { status: 429 });
  }

  const images = (await Promise.all(keys.map((key) => storage.get(key).catch(() => null)))).filter((image): image is Buffer => image !== null);
  if (!images.length) return NextResponse.json({ error: "Les photos n’ont pas pu être lues. Ajoutez-les de nouveau." }, { status: 422 });

  try {
    const suggestion = await suggestProductDetails(images, parsed.data.name);
    // Crédit compté seulement quand l'IA a répondu.
    const uses = await recordDraftAiUse(draft.id);
    return NextResponse.json({ ...suggestion, remaining: Math.max(0, wizardAiLimit - uses) });
  } catch (error) {
    if (error instanceof ProductAiError) return NextResponse.json({ error: error.message }, { status: 502 });
    throw error;
  }
}
