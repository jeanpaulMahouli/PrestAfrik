import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { PhotoError, purgeTemporaryPhotos, saveTemporaryPhoto } from "@/lib/product-photos";
import { isSameOrigin } from "@/lib/request-guards";
import { auth } from "@/modules/auth/server";
import { findDraft } from "@/modules/stores/draft";

export const runtime = "nodejs";

/**
 * Envoi d'une photo du premier produit pendant l'assistant de création (?brouillon=…).
 * La boutique n'existe pas encore : la photo est rangée sous l'identifiant du brouillon, qui deviendra
 * celui de la boutique.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requête refusée." }, { status: 403 });
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Votre session a expiré. Reconnectez-vous pour continuer." }, { status: 401 });
  const draft = await findDraft(session.user.id, new URL(request.url).searchParams.get("brouillon"));
  if (!draft || draft.id !== new URL(request.url).searchParams.get("brouillon")) {
    return NextResponse.json({ error: "Boutique en cours de création introuvable. Rechargez la page." }, { status: 404 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "Cette photo dépasse 5 Mo. Réduisez-la puis réessayez." }, { status: 413 });
  }
  const file = (await request.formData().catch(() => null))?.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "Aucune photo reçue." }, { status: 400 });
  try {
    const photo = await saveTemporaryPhoto(draft.id, file);
    void purgeTemporaryPhotos(draft.id).catch(() => undefined);
    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    if (error instanceof PhotoError) return NextResponse.json({ error: error.message }, { status: 422 });
    throw error;
  }
}
