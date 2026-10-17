import "server-only";

import { randomUUID } from "node:crypto";
import sharp, { type Metadata as SharpMetadata } from "sharp";
import { storage } from "@/lib/storage";

// Photos produit (brief §6.4) : JPG/PNG/WebP vérifiés sur leur contenu, 5 Mo maximum, 400 à 8000 px,
// métadonnées retirées, rotation appliquée, trois tailles WebP. Les envois précèdent l'enregistrement du
// produit : ils restent dans stores/{storeId}/tmp jusqu'à l'enregistrement (nettoyés après 24 h).
// Les fichiers sont confiés au stockage de src/lib/storage.ts (stockage objet en production).

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

const storeDir = (storeId: string) => `stores/${storeId}`;
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
  const directory = `${storeDir(storeId)}/tmp`;
  await Promise.all(
    photoSizes.map(async (size) => {
      // rotate() applique l'orientation EXIF ; sharp ne recopie aucune métadonnée (dont la géolocalisation).
      const body = await sharp(input, { failOn: "error", limitInputPixels: 64_000_000 })
        .rotate()
        .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
      await storage.put(`${directory}/${fileName(id, size)}`, body);
    }),
  );
  return {
    key: `tmp/${id}`,
    previewUrl: `/media/stores/${storeId}/tmp/${fileName(id, 320)}`,
    width,
    height,
  };
}

// Rattacher une photo = déplacer ses trois tailles de tmp/ vers son dossier définitif. Avec un stockage
// distant (Cloudinary), cela prend 2 à 3 secondes par photo : ces opérations ne doivent JAMAIS se faire
// dans une transaction de base de données (Prisma l'interrompt au bout de 5 s → erreur serveur).
// D'où trois étapes : vérifier avant la transaction, écrire l'adresse pendant, déplacer après.

function temporaryPhotoId(key: string) {
  const match = tmpKeyPattern.exec(key);
  if (!match) throw new PhotoError("Photo invalide. Réessayez l’envoi.");
  return match[1];
}

/** Étape 1 (avant la transaction) : vérifie, en parallèle, que les photos envoyées n'ont pas expiré. */
export async function checkTemporaryPhotos(storeId: string, keys: string[]) {
  const results = await Promise.all(keys.map((key) => storage.exists(`${storeDir(storeId)}/tmp/${fileName(temporaryPhotoId(key), 1600)}`)));
  if (results.includes(false)) throw new PhotoError("Une photo envoyée a expiré. Ajoutez-la de nouveau.");
}

/** Étape 2 (pendant la transaction) : adresse définitive d'une photo, sans accès au stockage. */
export function attachedPhotoUrl(storeId: string, folder: string, key: string) {
  return `/media/stores/${storeId}/${folder}/${fileName(temporaryPhotoId(key), 1600)}`;
}

/**
 * Étape 3 (après la transaction) : déplace les photos vers leur dossier définitif, toutes en parallèle.
 * Retourne les adresses des photos qui n'ont pas pu être déplacées (à retirer de la base).
 */
export async function moveTemporaryPhotos(storeId: string, folder: string, keys: string[]) {
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      const id = temporaryPhotoId(key);
      await Promise.all(
        photoSizes.map((size) => storage.move(`${storeDir(storeId)}/tmp/${fileName(id, size)}`, `${storeDir(storeId)}/${folder}/${fileName(id, size)}`)),
      );
    }),
  );
  const failed: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("Photo non rattachée :", keys[index], result.reason);
      failed.push(attachedPhotoUrl(storeId, folder, keys[index]));
    }
  });
  return failed;
}

/** Rattache tout de suite des photos à une page éditoriale (hors transaction) ; retourne leurs adresses. */
export async function attachTemporaryPagePhotos(storeId: string, keys: string[]) {
  await checkTemporaryPhotos(storeId, keys);
  const failed = await moveTemporaryPhotos(storeId, "pages", keys);
  if (failed.length) throw new PhotoError("Une photo n’a pas pu être enregistrée. Ajoutez-la de nouveau.");
  return keys.map((key) => attachedPhotoUrl(storeId, "pages", key));
}

/** Supprime toutes les tailles d'une photo (nouveau format) ou l'ancien fichier unique. */
export async function deleteProductPhoto(url: string) {
  const path = url.replace(/^\/media\//, "");
  if (mediaPathPattern.test(path)) {
    await Promise.all(photoSizes.map((size) => storage.delete(photoVariant(path, size)).catch(() => undefined)));
    return;
  }
  const { deleteStoreImage } = await import("@/lib/uploads");
  await deleteStoreImage(url);
}

export async function deleteProductPhotoFolder(storeId: string, productId: string) {
  await storage.deletePrefix(`${storeDir(storeId)}/products/${productId}`);
}

// Dernier nettoyage par boutique : au plus un par heure, pour ménager l'API d'administration de Cloudinary
// (nombre d'appels limité par heure) — inutile de lister le dossier à chaque photo envoyée.
const lastPurge = new Map<string, number>();
const purgeIntervalMs = 60 * 60 * 1000;

/** Nettoyage des photos provisoires de plus de 24 h (appelé par le worker et après les envois, une fois par heure). */
export async function purgeTemporaryPhotos(storeId: string, olderThanMs = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  if (now - (lastPurge.get(storeId) ?? 0) < purgeIntervalMs) return 0;
  lastPurge.set(storeId, now);
  const limit = now - olderThanMs;
  const expired = (await storage.list(`${storeDir(storeId)}/tmp/`)).filter((object) => object.lastModified.getTime() < limit);
  await Promise.all(expired.map((object) => storage.delete(object.key)));
  return expired.length;
}
