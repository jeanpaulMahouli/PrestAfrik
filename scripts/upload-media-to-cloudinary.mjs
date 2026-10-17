// Cloudinary : vérifie la connexion et envoie les images déjà enregistrées sur le disque
// (storage/uploads ou UPLOADS_DIR, et l'ancien public/uploads). Les images déjà présentes sont ignorées.
// Usage : node scripts/upload-media-to-cloudinary.mjs --check     (teste les identifiants, n'envoie rien)
//         node scripts/upload-media-to-cloudinary.mjs --dry-run   (liste ce qui serait envoyé)
//         node scripts/upload-media-to-cloudinary.mjs             (envoie)
// Les identifiants sont lus dans .env (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { v2 as cloudinary } from "cloudinary";

if (existsSync(".env")) process.loadEnvFile(".env");
const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
if (!cloudName || !apiKey || !apiSecret) {
  console.error("Renseignez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET (voir docs/stockage-images.md).");
  process.exit(1);
}
cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
const folder = (process.env.CLOUDINARY_FOLDER ?? "prestafrik").trim().replace(/^\/+|\/+$/g, "");

try {
  await cloudinary.api.ping();
  console.log(`Connexion à Cloudinary réussie (cloud « ${cloudName} », dossier « ${folder || "(racine)"} »).`);
} catch (error) {
  console.error("Connexion à Cloudinary impossible :", error?.error?.message ?? error?.message ?? error);
  process.exit(1);
}
if (process.argv.includes("--check")) process.exit(0);

const dryRun = process.argv.includes("--dry-run");
const roots = [resolve(process.env.UPLOADS_DIR || join("storage", "uploads")), resolve("public", "uploads")];
let sent = 0;
let skipped = 0;

for (const root of roots) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".webp")) continue;
    const file = join(entry.parentPath ?? entry.path, entry.name);
    const key = relative(root, file).split(sep).join("/");
    const publicId = [folder, key.replace(/\.webp$/, "")].filter(Boolean).join("/");
    const head = await fetch(`https://res.cloudinary.com/${cloudName}/image/upload/${publicId}.webp`, { method: "HEAD" });
    if (head.ok) {
      skipped++;
      continue;
    }
    if (!dryRun) {
      const body = await readFile(file);
      await new Promise((resolveUpload, rejectUpload) => {
        cloudinary.uploader
          .upload_stream({ public_id: publicId, resource_type: "image", format: "webp", overwrite: true }, (error) => (error ? rejectUpload(error) : resolveUpload()))
          .end(body);
      });
    }
    sent++;
    console.log(`${dryRun ? "[essai] " : ""}${key}`);
  }
}

console.log(`\n${sent} image(s) ${dryRun ? "à envoyer" : "envoyée(s)"}, ${skipped} déjà présente(s) sur Cloudinary.`);
