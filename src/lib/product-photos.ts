import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp, { type Metadata as SharpMetadata } from "sharp";
import { uploadsRoot } from "@/lib/uploads";

// Photos produit (brief §6.4) : JPG/PNG/WebP vérifiés sur leur contenu, 5 Mo maximum, 400 à 8000 px,
// métadonnées retirées, rotation appliquée, trois tailles WebP. Les envois précèdent l'enregistrement du
// produit : ils restent dans stores/{storeId}/tmp jusqu'à l'enregistrement (nettoyés après 24 h).

export const maxProductPhotos = 5;
export const maxPhotoBytes = 5 * 1024 * 1024;
export const photoSizes = [320, 800, 1600] as const;
export type PhotoSize = (typeof photoSizes)[number];

const uuidPattern = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const idPattern = "[a-z0-9]{20,40}";
export const tmpKeyPattern = new RegExp(`^tmp/(${uuidPattern})$`);
/** Chemins servis par /media (préfixés par la boutique : isolation des fichiers). */
export const mediaPathPattern = new RegExp(`^stores/${idPattern}/(?:products/${idPattern}|pages|tmp)/${uuidPattern}-(?:320|800|1600)\\.webp$`);

export class PhotoError extends Error {}

const storeDir = (storeId: string) => join(uploadsRoot, "stores", storeId);
const fileName = (id: string, size: PhotoSize) => `${id}-${size}.webp`;

export function photoUrl(storeId: string, productId: string, id: string, size: PhotoSize = 1600) {
  return `/media/stores/${storeId}/products/${productId}/${fileName(id, size)}`;
}

/** Variante d'une photo (miniature pour les listes, grande taille pour la fiche). */
export function photoVariant(url: string, size: PhotoSize) {
  return url.replace(/-(320|800|1600)\.webp$/, `-${size}.webp`);
}

export async function saveTemporaryPhoto(storeId: string, file: File) {
  if (file.size === 0) throw new PhotoError("Le fichier est vide.");
  if (file.size > maxPhotoBytes) throw new PhotoError("Cette photo dépasse 5 Mo. Réduisez-la puis réessayez.");

  // sharp lit le contenu réel (signature du format) : l'extension et le type annoncé sont ignorés.
  const input = Buffer.from(await file.arrayBuffer());
  let metadata: SharpMetadata;
  try {
    metadata = await sharp(input, { failOn: "error", limitInputPixels: 64_000_000 }).metadata();
  } catch {
    throw new PhotoError("Ce fichier n’est pas une image lisible. Choisissez une photo JPG, PNG ou WebP.");
  }
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new PhotoError("Format refusé. Choisissez une photo JPG, PNG ou WebP.");
  }
  const width = metadata.autoOrient?.width ?? metadata.width ?? 0;
  const height = metadata.autoOrient?.height ?? metadata.height ?? 0;
  if (Math.min(width, height) < 400) throw new PhotoError("Cette photo est trop petite : 400 pixels de côté minimum.");
  if (Math.max(width, height) > 8000) throw new PhotoError("Cette photo est trop grande : 8 000 pixels de côté maximum.");

  const id = randomUUID();
  const directory = join(storeDir(storeId), "tmp");
  await mkdir(directory, { recursive: true });
  for (const size of photoSizes) {
    // rotate() applique l'orientation EXIF ; sharp ne recopie aucune métadonnée (dont la géolocalisation).
    await sharp(input, { failOn: "error", limitInputPixels: 64_000_000 })
      .rotate()
      .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(join(directory, fileName(id, size)));
  }
  return {
    key: `tmp/${id}`,
    previewUrl: `/media/stores/${storeId}/tmp/${fileName(id, 320)}`,
    width,
    height,
  };
}

/** Rattache une photo provisoire au produit ; retourne son adresse définitive (1600 px). */
export async function attachTemporaryPhoto(storeId: string, productId: string, key: string) {
  return attachTemporaryPhotoTo(storeId, `products/${productId}`, key);
}

/** Rattache une photo provisoire à une page éditoriale de la boutique. */
export async function attachTemporaryPagePhoto(storeId: string, key: string) {
  return attachTemporaryPhotoTo(storeId, "pages", key);
}

async function attachTemporaryPhotoTo(storeId: string, folder: string, key: string) {
  const match = tmpKeyPattern.exec(key);
  if (!match) throw new PhotoError("Photo invalide. Réessayez l’envoi.");
  const id = match[1];
  const source = join(storeDir(storeId), "tmp");
  const target = join(storeDir(storeId), ...folder.split("/"));
  await stat(join(source, fileName(id, 1600))).catch(() => {
    throw new PhotoError("Une photo envoyée a expiré. Ajoutez-la de nouveau.");
  });
  await mkdir(target, { recursive: true });
  for (const size of photoSizes) await rename(join(source, fileName(id, size)), join(target, fileName(id, size)));
  return `/media/stores/${storeId}/${folder}/${fileName(id, 1600)}`;
}

/** Supprime toutes les tailles d'une photo (nouveau format) ou l'ancien fichier unique. */
export async function deleteProductPhoto(url: string) {
  const path = url.replace(/^\/media\//, "");
  if (mediaPathPattern.test(path)) {
    await Promise.all(photoSizes.map((size) => rm(join(uploadsRoot, photoVariant(path, size)), { force: true })));
    return;
  }
  const { deleteStoreImage } = await import("@/lib/uploads");
  await deleteStoreImage(url);
}

export async function deleteProductPhotoFolder(storeId: string, productId: string) {
  await rm(join(storeDir(storeId), "products", productId), { recursive: true, force: true });
}

/** Nettoyage des photos provisoires de plus de 24 h (appelé par le worker et à chaque envoi). */
export async function purgeTemporaryPhotos(storeId: string, olderThanMs = 24 * 60 * 60 * 1000) {
  const directory = join(storeDir(storeId), "tmp");
  const entries = await readdir(directory).catch(() => [] as string[]);
  const limit = Date.now() - olderThanMs;
  let removed = 0;
  await Promise.all(
    entries.map(async (entry) => {
      const file = join(directory, entry);
      const info = await stat(file).catch(() => null);
      if (info && info.mtimeMs < limit) {
        await rm(file, { force: true });
        removed += 1;
      }
    }),
  );
  return removed;
}
