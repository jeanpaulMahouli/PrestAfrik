import { readFile } from "node:fs/promises";
import { mediaPathPattern } from "@/lib/product-photos";
import { storage } from "@/lib/storage";
import { isSafeUploadPath, legacyUploadPath, uploadKey } from "@/lib/uploads";

const headers = {
  "Content-Type": "image/webp",
  // Les noms de fichiers sont aléatoires et jamais réutilisés.
  "Cache-Control": "public, max-age=31536000, immutable",
  "X-Content-Type-Options": "nosniff",
};

/** Sert les images envoyées par les vendeurs depuis le stockage (voir src/lib/storage.ts). */
export async function GET(_request: Request, { params }: RouteContext<"/media/[...path]">) {
  const { path } = await params;
  const relative = path.join("/");

  let content: Buffer | null = null;
  if (mediaPathPattern.test(relative)) {
    content = await storage.get(relative);
  } else if (path.length === 2 && isSafeUploadPath(path[0], path[1])) {
    // Format des logos : /media/{storeId}/{uuid}.webp — avec l'ancien dossier public/uploads en secours.
    content = (await storage.get(uploadKey(path[0], path[1]))) ?? (await readFile(legacyUploadPath(path[0], path[1])).catch(() => null));
  }

  if (content) return new Response(new Uint8Array(content), { headers });
  return new Response("Image introuvable.", { status: 404 });
}
