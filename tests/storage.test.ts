import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let dir: string;
let storage: (typeof import("@/lib/storage"))["storage"];

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "prestafrik-storage-"));
  vi.stubEnv("UPLOADS_DIR", dir);
  vi.stubEnv("OBJECT_STORAGE_BUCKET", "");
  ({ storage } = await import("@/lib/storage"));
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe("stockage des images (disque local)", () => {
  it("utilise le disque quand aucun bucket n'est configuré", () => {
    expect(storage.kind).toBe("local");
  });

  it("enregistre, relit, déplace, liste et supprime", async () => {
    const body = Buffer.from("image");
    await storage.put("stores/abc/tmp/1-320.webp", body);
    expect(await storage.get("stores/abc/tmp/1-320.webp")).toEqual(body);
    expect(await storage.exists("stores/abc/tmp/1-320.webp")).toBe(true);

    await storage.move("stores/abc/tmp/1-320.webp", "stores/abc/products/p1/1-320.webp");
    expect(await storage.exists("stores/abc/tmp/1-320.webp")).toBe(false);
    expect((await storage.list("stores/abc/products/")).map((o) => o.key)).toEqual(["stores/abc/products/p1/1-320.webp"]);

    await storage.deletePrefix("stores/abc/products/p1");
    expect(await storage.get("stores/abc/products/p1/1-320.webp")).toBeNull();
  });

  it("refuse les clés qui sortent du dossier", async () => {
    await expect(storage.put("../hors.webp", Buffer.from("x"))).rejects.toThrow();
  });
});
