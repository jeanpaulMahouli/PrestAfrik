// Copie les images déjà enregistrées sur le disque (storage/uploads ou UPLOADS_DIR, et l'ancien public/uploads)
// vers le stockage objet configuré par OBJECT_STORAGE_*. À lancer une fois, sur le serveur qui a les fichiers,
// avant (ou juste après) d'activer le stockage objet. Les fichiers déjà présents dans le bucket sont ignorés.
// Usage : node scripts/upload-media-to-bucket.mjs            (lit .env)
//         node scripts/upload-media-to-bucket.mjs --dry-run  (affiche sans envoyer)
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

if (existsSync(".env")) process.loadEnvFile(".env");
const dryRun = process.argv.includes("--dry-run");
const bucket = process.env.OBJECT_STORAGE_BUCKET?.trim();
if (!bucket) {
  console.error("OBJECT_STORAGE_BUCKET n'est pas défini : configurez d'abord le stockage objet (docs/stockage-images.md).");
  process.exit(1);
}

const client = new S3Client({
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT || undefined,
  region: process.env.OBJECT_STORAGE_REGION || "auto",
  credentials: {
    accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY ?? "",
  },
  forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE !== "false",
});

const roots = [resolve(process.env.UPLOADS_DIR || join("storage", "uploads")), resolve("public", "uploads")];
let sent = 0;
let skipped = 0;

for (const root of roots) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".webp")) continue;
    const file = join(entry.parentPath ?? entry.path, entry.name);
    const key = relative(root, file).split(sep).join("/");
    const exists = await client
      .send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      .then(() => true)
      .catch(() => false);
    if (exists) {
      skipped++;
      continue;
    }
    if (!dryRun) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: await readFile(file), ContentType: "image/webp" }));
    }
    sent++;
    console.log(`${dryRun ? "[essai] " : ""}${key}`);
  }
}

console.log(`\n${sent} image(s) ${dryRun ? "à envoyer" : "envoyée(s)"}, ${skipped} déjà présente(s) dans « ${bucket} ».`);
