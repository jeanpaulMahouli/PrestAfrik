import "server-only";

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const version = "v1";

// SECRETS_ENCRYPTION_KEY is preferred; without it, a dedicated key is derived from
// BETTER_AUTH_SECRET. Changing the source key makes stored secrets unreadable.
function encryptionKey() {
  const source = process.env.SECRETS_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET;
  if (!source || source.length < 32) {
    throw new Error("SECRETS_ENCRYPTION_KEY (ou BETTER_AUTH_SECRET) doit contenir au moins 32 caractères.");
  }
  return Buffer.from(hkdfSync("sha256", source, "prestafrik", "store-secrets:v1", 32));
}

export function encryptSecret(plainText: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return [version, iv, cipher.getAuthTag(), encrypted]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(":");
}

export function decryptSecret(payload: string) {
  const [payloadVersion, iv, tag, encrypted] = payload.split(":");
  if (payloadVersion !== version || !iv || !tag || !encrypted) {
    throw new Error("Secret chiffré illisible.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
