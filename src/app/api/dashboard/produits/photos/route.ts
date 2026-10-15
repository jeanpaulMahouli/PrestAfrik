import { NextResponse } from "next/server";
import { PhotoError, purgeTemporaryPhotos, saveTemporaryPhoto } from "@/lib/product-photos";
import { isSameOrigin } from "@/lib/request-guards";
import { hasPermission } from "@/modules/auth/permissions";
import { getStoreContext } from "@/modules/stores/context";

export const runtime = "nodejs";

/** Envoi d'une photo produit (une par requête, pour une progression et des erreurs par fichier). */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Requête refusée." }, { status: 403 });
  }
  const { store, membership } = await getStoreContext();
  if (!hasPermission(membership.role, "products.manage")) {
    return NextResponse.json({ error: "Vous n’avez pas l’autorisation de modifier le catalogue." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "Cette photo dépasse 5 Mo. Réduisez-la puis réessayez." }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucune photo reçue." }, { status: 400 });
  }
  try {
    const photo = await saveTemporaryPhoto(store.id, file);
    void purgeTemporaryPhotos(store.id).catch(() => undefined);
    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    if (error instanceof PhotoError) return NextResponse.json({ error: error.message }, { status: 422 });
    throw error;
  }
}
