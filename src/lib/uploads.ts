import "server-only";

import { randomUUID } from "node:crypto";
import { join } from "node:path";
import sharp from "sharp";
import { legacyUploadsRoot, storage } from "@/lib/storage";

// Les images (logos de boutique) sont confiées au stockage de src/lib/storage.ts — stockage objet en
// production, disque local en développement — et servies par src/app/media/[...path]/route.ts.
export { legacyUploadsRoot };
export const maxImageBytes = 2 * 1024 * 1024;

const storeIdPattern = /^[a-z0-9]{20,40}$/;
const filenamePattern = /^[0-9a-f-]{36}\.webp$/;

export class ImageUploadError extends Error {}

export function isSafeUploadPath(storeId: string, filename: string) {
  return storeIdPattern.test(storeId) && filenamePattern.test(filename);
}

/** Clé de stockage d'une image de boutique (format « {storeId}/{uuid}.webp »). */
export function uploadKey(storeId: string, filename: string) {
  if (!isSafeUploadPath(storeId, filename)) throw new ImageUploadError("Chemin d’image invalide.");
  return `${storeId}/${filename}`;
}

/** Chemin sur disque de l'ancien emplacement public/uploads. */
export function legacyUploadPath(storeId: string, filename: string) {
  return join(legacyUploadsRoot, uploadKey(storeId, filename));
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

  const filename = `${randomUUID()}.webp`;
  const maxSide = options.maxSide ?? 1600;
  const body = await image
    .rotate()
    .resize({ width: maxSide, height: maxSide, fit: options.square ? "cover" : "inside", withoutEnlargement: !options.square })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  const key = uploadKey(storeId, filename);
  await storage.put(key, body);
  return { key, url: `/media/${key}` };
}

/** Supprime une image déjà enregistrée (stockage actuel ou ancien emplacement), sans échouer si elle manque. */
export async function deleteStoreImage(url: string) {
  const match = /^\/(media|uploads)\/([^/]+)\/([^/]+)$/.exec(url);
  if (!match || !isSafeUploadPath(match[2], match[3])) return;
  if (match[1] === "media") {
    await storage.delete(uploadKey(match[2], match[3])).catch(() => undefined);
  } else {
    const { rm } = await import("node:fs/promises");
    await rm(legacyUploadPath(match[2], match[3]), { force: true });
  }
}

/* ---------- Photos de profil ---------- */

// Format « users/{userId}/{uuid}.webp » : les identifiants Better Auth mélangent majuscules et minuscules.
export const avatarPathPattern = /^users\/[A-Za-z0-9_-]{16,64}\/[0-9a-f-]{36}\.webp$/;

/** Valide, recadre en carré (512 px) et enregistre la photo de profil d'un utilisateur. */
export async function saveUserAvatar(file: FormDataEntryValue | null, userId: string) {
  if (file === null || (file instanceof File && file.size === 0)) return null;
  if (!(file instanceof File)) throw new ImageUploadError("Le fichier image est invalide.");
  if (file.size > maxImageBytes) throw new ImageUploadError("La photo ne peut pas dépasser 2 Mo.");

  const image = sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error", limitInputPixels: 25_000_000 });
  let metadata;
  try {
    metadata = await image.metadata();
  } catch {
    throw new ImageUploadError("Cette image est illisible. Choisissez une image PNG, JPG ou WebP.");
  }
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new ImageUploadError("Choisissez une image PNG, JPG ou WebP.");
  }

  const key = `users/${userId}/${randomUUID()}.webp`;
  if (!avatarPathPattern.test(key)) throw new ImageUploadError("Chemin d’image invalide.");
  // rotate() applique l'orientation EXIF ; la conversion WebP retire les métadonnées (position GPS…).
  const body = await image.rotate().resize({ width: 512, height: 512, fit: "cover" }).webp({ quality: 82, effort: 4 }).toBuffer();
  await storage.put(key, body);
  return `/media/${key}`;
}

/** Supprime une photo de profil enregistrée, sans échouer si elle manque (les images externes sont ignorées). */
export async function deleteUserAvatar(url: string | null | undefined) {
  const key = url?.replace(/^\/media\//, "");
  if (key && avatarPathPattern.test(key)) await storage.delete(key).catch(() => undefined);
}
