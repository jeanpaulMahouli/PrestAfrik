import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { isSafeUploadPath, legacyUploadPath, uploadKey } from "@/lib/uploads";

export const runtime = "nodejs";

const sizes = [32, 180, 192, 512] as const;

/** Lit le logo d'une boutique dans le stockage (format « /media/{storeId}/{uuid}.webp », ancien /uploads en secours). */
async function readLogo(logoUrl: string) {
  const match = /^\/(?:media|uploads)\/([^/]+)\/([^/]+)$/.exec(logoUrl);
  if (!match || !isSafeUploadPath(match[1], match[2])) return null;
  return (await storage.get(uploadKey(match[1], match[2]))) ?? (await readFile(legacyUploadPath(match[1], match[2])).catch(() => null));
}

/**
 * Favicon d'une boutique : son logo en PNG carré (?taille=32|180|192|512).
 * Sans logo, ou si le logo est illisible, on renvoie vers l'icône PrestAfrik.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/boutique/[slug]/icone">) {
  const { slug } = await params;
  const requested = Number(new URL(request.url).searchParams.get("taille"));
  const size = sizes.find((value) => value === requested) ?? 192;
  // Redirection relative : derrière un proxy (ou un serveur sur 0.0.0.0), request.url ne donne pas l'adresse publique.
  const fallback = () => new Response(null, { status: 302, headers: { Location: size === 180 ? "/brand/apple-icon.png" : "/brand/icon.png" } });

  const store = await prisma.store.findUnique({ where: { slug }, select: { logoUrl: true } });
  if (!store?.logoUrl) return fallback();
  const logo = await readLogo(store.logoUrl);
  if (!logo) return fallback();

  try {
    // Fond blanc pour l'icône Apple (iOS remplit la transparence en noir) ; transparent ailleurs.
    const image = sharp(logo).resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: size === 180 ? 1 : 0 } });
    const png = await (size === 180 ? image.flatten({ background: "#ffffff" }) : image).png().toBuffer();
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        // L'adresse change avec le logo (?v=…) : la réponse peut être gardée longtemps.
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return fallback();
  }
}
