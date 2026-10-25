import "server-only";

import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";

/**
 * Stockage des images envoyées par les vendeurs (logos, photos produit, pages).
 *
 * Par ordre de priorité :
 * - Cloudinary dès que CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET sont définis ;
 * - stockage objet S3 compatible (Supabase Storage, Cloudflare R2, AWS S3…) dès que OBJECT_STORAGE_BUCKET est défini ;
 *   dans ces deux cas, les fichiers survivent aux redéploiements : à utiliser en production ;
 * - sinon, disque local : UPLOADS_DIR, ou storage/uploads par défaut (développement, ou serveur avec disque persistant).
 *
 * Les clés sont des chemins relatifs, par exemple « stores/{storeId}/products/{productId}/{uuid}-800.webp ».
 * Les images restent servies par /media/… (src/app/media/[...path]/route.ts) : les adresses en base ne changent pas.
 * Voir docs/stockage-images.md.
 */
export type StoredObject = { key: string; lastModified: Date };

export interface StorageDriver {
  readonly kind: "cloudinary" | "s3" | "local";
  put(key: string, body: Buffer, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<StoredObject[]>;
}

/* ---------- Disque local ---------- */

export const localUploadsRoot = resolve(process.env.UPLOADS_DIR || join(process.cwd(), "storage", "uploads"));

function localPath(key: string) {
  const file = resolve(localUploadsRoot, ...key.split("/"));
  if (!file.startsWith(localUploadsRoot + sep)) throw new Error("Clé de stockage invalide.");
  return file;
}

const localDriver: StorageDriver = {
  kind: "local",
  async put(key, body) {
    const file = localPath(key);
    await mkdir(dirname(file), { recursive: true });
    // Écriture dans un fichier temporaire puis renommage : jamais d'image à moitié écrite.
    await writeFile(`${file}.tmp`, body);
    await rename(`${file}.tmp`, file);
  },
  get: (key) => readFile(localPath(key)).catch(() => null),
  delete: (key) => rm(localPath(key), { force: true }),
  deletePrefix: (prefix) => rm(localPath(prefix.replace(/\/$/, "")), { recursive: true, force: true }),
  async move(from, to) {
    const target = localPath(to);
    await mkdir(dirname(target), { recursive: true });
    await rename(localPath(from), target);
  },
  exists: (key) =>
    stat(localPath(key))
      .then(() => true)
      .catch(() => false),
  async list(prefix) {
    const directory = localPath(prefix.replace(/\/$/, ""));
    const entries = await readdir(directory, { recursive: true, withFileTypes: true }).catch(() => []);
    const files = entries.filter((entry) => entry.isFile());
    return Promise.all(
      files.map(async (entry) => {
        // parentPath (Node ≥ 20.12) remplace l'ancien « path ».
        const parent = (entry as { parentPath?: string; path?: string }).parentPath ?? (entry as { path?: string }).path ?? directory;
        const file = join(parent, entry.name);
        const info = await stat(file);
        return { key: relative(localUploadsRoot, file).split(sep).join("/"), lastModified: info.mtime };
      }),
    );
  },
};

/* ---------- Stockage objet S3 compatible ---------- */

function createS3Driver(bucket: string): StorageDriver {
  const client = new S3Client({
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT || undefined,
    region: process.env.OBJECT_STORAGE_REGION || "auto",
    credentials: {
      accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY ?? "",
    },
    // Adresses « endpoint/bucket/clé » : requis par Supabase Storage et MinIO, accepté par R2 et AWS.
    forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE !== "false",
  });

  const isMissing = (error: unknown) => {
    const name = (error as { name?: string })?.name;
    return name === "NoSuchKey" || name === "NotFound";
  };

  const driver: StorageDriver = {
    kind: "s3",
    async put(key, body, contentType = "image/webp") {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    },
    async get(key) {
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return result.Body ? Buffer.from(await result.Body.transformToByteArray()) : null;
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    async deletePrefix(prefix) {
      const objects = await driver.list(prefix.endsWith("/") ? prefix : `${prefix}/`);
      // DeleteObjects accepte 1 000 clés par appel.
      for (let i = 0; i < objects.length; i += 1000) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: objects.slice(i, i + 1000).map(({ key }) => ({ Key: key })), Quiet: true },
          }),
        );
      }
    },
    async move(from, to) {
      await client.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `${bucket}/${encodeURI(from)}`, Key: to }));
      await driver.delete(from);
    },
    async exists(key) {
      const objects = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: key, MaxKeys: 1 }));
      return objects.Contents?.some((object) => object.Key === key) ?? false;
    },
    async list(prefix) {
      const objects: StoredObject[] = [];
      let token: string | undefined;
      do {
        const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
        for (const object of page.Contents ?? []) {
          if (object.Key) objects.push({ key: object.Key, lastModified: object.LastModified ?? new Date(0) });
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
      return objects;
    },
  };
  return driver;
}

/* ---------- Cloudinary ---------- */

/**
 * Chaque clé devient un « public_id » Cloudinary rangé dans CLOUDINARY_FOLDER (par défaut « prestafrik ») :
 * « stores/abc/products/p1/uuid-800.webp » → « prestafrik/stores/abc/products/p1/uuid-800 » (format webp).
 * La lecture passe par l'adresse publique de livraison (CDN, sans quota) ; seules la liste et la suppression
 * par dossier utilisent l'API d'administration (limitée en nombre d'appels par heure).
 */
function createCloudinaryDriver(cloudName: string, apiKey: string, apiSecret: string): StorageDriver {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  const folder = (process.env.CLOUDINARY_FOLDER ?? "prestafrik").trim().replace(/^\/+|\/+$/g, "");
  const toPublicId = (key: string) => [folder, key.replace(/\.webp$/, "")].filter(Boolean).join("/");
  const toKey = (publicId: string) => `${folder ? publicId.slice(folder.length + 1) : publicId}.webp`;
  const deliveryUrl = (key: string) => `https://res.cloudinary.com/${cloudName}/image/upload/${toPublicId(key)}.webp`;
  const isNotFound = (error: unknown) => (error as { http_code?: number; error?: { http_code?: number } })?.http_code === 404 || (error as { error?: { http_code?: number } })?.error?.http_code === 404;

  const driver: StorageDriver = {
    kind: "cloudinary",
    put(key, body) {
      return new Promise((resolvePut, rejectPut) => {
        const stream = cloudinary.uploader.upload_stream(
          { public_id: toPublicId(key), resource_type: "image", format: "webp", overwrite: true, invalidate: true, use_filename: false, unique_filename: false },
          (error) => (error ? rejectPut(new Error(`Cloudinary : ${error.message}`)) : resolvePut()),
        );
        stream.end(body);
      });
    },
    async get(key) {
      const response = await fetch(deliveryUrl(key), { cache: "no-store" });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Cloudinary : lecture impossible (${response.status}).`);
      return Buffer.from(await response.arrayBuffer());
    },
    async delete(key) {
      await cloudinary.uploader.destroy(toPublicId(key), { resource_type: "image", invalidate: true });
    },
    async deletePrefix(prefix) {
      await cloudinary.api.delete_resources_by_prefix(`${toPublicId(prefix.replace(/\/$/, ""))}/`, { resource_type: "image", invalidate: true });
    },
    async move(from, to) {
      await cloudinary.uploader.rename(toPublicId(from), toPublicId(to), { resource_type: "image", overwrite: true, invalidate: true });
    },
    async exists(key) {
      const response = await fetch(deliveryUrl(key), { method: "HEAD", cache: "no-store" });
      return response.ok;
    },
    async list(prefix) {
      const objects: StoredObject[] = [];
      let cursor: string | undefined;
      try {
        do {
          const page = await cloudinary.api.resources({ type: "upload", resource_type: "image", prefix: toPublicId(prefix.replace(/\/$/, "")) + "/", max_results: 500, next_cursor: cursor });
          for (const resource of page.resources as Array<{ public_id: string; created_at: string }>) {
            objects.push({ key: toKey(resource.public_id), lastModified: new Date(resource.created_at) });
          }
          cursor = page.next_cursor;
        } while (cursor);
      } catch (error) {
        if (isNotFound(error)) return [];
        throw error;
      }
      return objects;
    },
  };
  return driver;
}

function createStorage(): StorageDriver {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (cloudName && apiKey && apiSecret) return createCloudinaryDriver(cloudName, apiKey, apiSecret);
  if (cloudName || apiKey || apiSecret) {
    throw new Error("Cloudinary est partiellement configuré : renseignez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET.");
  }
  const bucket = process.env.OBJECT_STORAGE_BUCKET?.trim();
  return bucket ? createS3Driver(bucket) : localDriver;
}

/** Un envoi d'image qui échoue (stockage indisponible, quota…) remonte dans la cloche de l'administration. */
function reportUploadFailures(driver: StorageDriver): StorageDriver {
  return {
    ...driver,
    async put(key, body, contentType) {
      try {
        return await driver.put(key, body, contentType);
      } catch (error) {
        const { recordSystemNotification } = await import("@/modules/system/notifications");
        await recordSystemNotification({ type: "upload", severity: "CRITICAL", message: `Échec d’enregistrement d’une image : ${error instanceof Error ? error.message : String(error)}` });
        throw error;
      }
    },
  };
}

/** Stockage utilisé par l'application (Cloudinary ou stockage objet si configuré, sinon disque local). */
export const storage: StorageDriver = reportUploadFailures(createStorage());

/** Ancien emplacement (public/uploads), lu en secours pour les toutes premières images. */
export const legacyUploadsRoot = join(process.cwd(), "public", "uploads");
