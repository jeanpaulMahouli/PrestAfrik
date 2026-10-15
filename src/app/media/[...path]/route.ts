import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { mediaPathPattern } from "@/lib/product-photos";
import { isSafeUploadPath, legacyUploadsRoot, uploadFilePath, uploadsRoot } from "@/lib/uploads";

const headers = {
  "Content-Type": "image/webp",
  // Les noms de fichiers sont aléatoires et jamais réutilisés.
  "Cache-Control": "public, max-age=31536000, immutable",
  "X-Content-Type-Options": "nosniff",
};

/** Sert les images stockées hors de public/ (voir src/lib/uploads.ts et src/lib/product-photos.ts). */
export async function GET(_request: Request, { params }: RouteContext<"/media/[...path]">) {
  const { path } = await params;
  const relative = path.join("/");

  let candidates: string[] = [];
  if (mediaPathPattern.test(relative)) {
    candidates = [join(uploadsRoot, ...path)];
  } else if (path.length === 2 && isSafeUploadPath(path[0], path[1])) {
    // Ancien format : /media/{storeId}/{uuid}.webp (logos, premières photos).
    candidates = [uploadFilePath(path[0], path[1]), uploadFilePath(path[0], path[1], legacyUploadsRoot)];
  }

  for (const file of candidates) {
    const content = await readFile(file).catch(() => null);
    if (content) return new Response(content, { headers });
  }
  return new Response("Image introuvable.", { status: 404 });
}
