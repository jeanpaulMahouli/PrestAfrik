import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, rename, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

// Images are kept outside `public/`: `next start` only serves public files that
// existed at build time. They are served by `src/app/media/[...path]/route.ts`.
// UPLOADS_DIR must point to a persistent disk in production.
export const uploadsRoot = resolve(process.env.UPLOADS_DIR || join(process.cwd(), "storage", "uploads"));
export const legacyUploadsRoot = join(process.cwd(), "public", "uploads");
export const maxImageBytes = 2 * 1024 * 1024;

const storeIdPattern = /^[a-z0-9]{20,40}$/;
const filenamePattern = /^[0-9a-f-]{36}\.webp$/;

export class ImageUploadError extends Error {}

export function isSafeUploadPath(storeId: string, filename: string) {
  return storeIdPattern.test(storeId) && filenamePattern.test(filename);
}

export function uploadFilePath(storeId: string, filename: string, root = uploadsRoot) {
  if (!isSafeUploadPath(storeId, filename)) throw new ImageUploadError("Chemin d’image invalide.");
  return join(root, storeId, filename);
}

/** Valide, réoriente et convertit l’image en WebP. Retourne null si aucun fichier n’est envoyé. */
export async function saveStoreImage(
  file: FormDataEntryValue | null,
  storeId: string,
  options: { maxSide?: number; square?: boolean } = {},
) {
  if (file === null || (file instanceof File && file.size === 0)) return null;
  if (!(file instanceof File)) throw new ImageUploadError("Le fichier image est invalide.");
  if (file.size > maxImageBytes) throw new ImageUploadError("La photo ne peut pas dépasser 2 Mo.");

  const image = sharp(Buffer.from(await file.arrayBuffer()), {
    failOn: "error",
    limitInputPixels: 25_000_000,
  });
  let metadata;
  try {
    metadata = await image.metadata();
  } catch {
    throw new ImageUploadError("Cette image est illisible. Choisis une image PNG, JPG ou WebP.");
  }
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new ImageUploadError("Choisis une image PNG, JPG ou WebP.");
  }
  if (!metadata.width || !metadata.height || metadata.width > 5000 || metadata.height > 5000) {
    throw new ImageUploadError("L’image ne peut pas dépasser 5 000 pixels de côté.");
  }

  const imageId = randomUUID();
  const filename = `${imageId}.webp`;
  const directory = join(uploadsRoot, storeId);
  const finalFile = uploadFilePath(storeId, filename);
  const temporaryFile = join(directory, `${imageId}.tmp`);
  const maxSide = options.maxSide ?? 1600;
  await mkdir(directory, { recursive: true });
  await image
    .rotate()
    .resize({ width: maxSide, height: maxSide, fit: options.square ? "cover" : "inside", withoutEnlargement: !options.square })
    .webp({ quality: 82, effort: 4 })
    .toFile(temporaryFile);
  await rename(temporaryFile, finalFile);
  return { path: finalFile, url: `/media/${storeId}/${filename}` };
}

/** Supprime une image déjà enregistrée (nouveau ou ancien emplacement), sans échouer si elle manque. */
export async function deleteStoreImage(url: string) {
  const match = /^\/(media|uploads)\/([^/]+)\/([^/]+)$/.exec(url);
  if (!match || !isSafeUploadPath(match[2], match[3])) return;
  const root = match[1] === "media" ? uploadsRoot : legacyUploadsRoot;
  await unlink(uploadFilePath(match[2], match[3], root)).catch(() => undefined);
}
