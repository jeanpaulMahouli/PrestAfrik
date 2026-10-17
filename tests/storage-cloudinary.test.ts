import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// SDK Cloudinary simulé : on vérifie les appels (identifiants publics, options), sans réseau.
const sdk = vi.hoisted(() => ({
  config: vi.fn(),
  uploader: {
    upload_stream: vi.fn((options: unknown, callback: (error?: { message: string }) => void) => ({ end: () => callback() })),
    destroy: vi.fn(async () => ({ result: "ok" })),
    rename: vi.fn(async () => ({})),
  },
  api: {
    delete_resources_by_prefix: vi.fn(async () => ({})),
    resources: vi.fn(async () => ({ resources: [{ public_id: "prestafrik/stores/abc/tmp/1-320", created_at: "2026-10-01T10:00:00Z" }] })),
  },
}));
vi.mock("cloudinary", () => ({ v2: sdk }));

let storage: (typeof import("@/lib/storage"))["storage"];
let configCalls: unknown[][] = [];
const fetchMock = vi.fn();

beforeAll(async () => {
  vi.stubEnv("CLOUDINARY_CLOUD_NAME", "demo-cloud");
  vi.stubEnv("CLOUDINARY_API_KEY", "123");
  vi.stubEnv("CLOUDINARY_API_SECRET", "secret");
  vi.stubGlobal("fetch", fetchMock);
  ({ storage } = await import("@/lib/storage"));
  configCalls = [...sdk.config.mock.calls];
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("stockage des images (Cloudinary)", () => {
  it("est choisi quand les trois variables sont définies", () => {
    expect(storage.kind).toBe("cloudinary");
    expect(configCalls[0]?.[0]).toEqual(expect.objectContaining({ cloud_name: "demo-cloud", api_key: "123", api_secret: "secret" }));
  });

  it("envoie l'image sous un identifiant public rangé dans le dossier prestafrik", async () => {
    await storage.put("stores/abc/tmp/1-320.webp", Buffer.from("x"));
    expect(sdk.uploader.upload_stream).toHaveBeenCalledWith(
      expect.objectContaining({ public_id: "prestafrik/stores/abc/tmp/1-320", format: "webp", overwrite: true }),
      expect.any(Function),
    );
  });

  it("lit l'image par l'adresse de livraison et renvoie null si elle n'existe pas", async () => {
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    expect(await storage.get("abc123def456ghi789jk/uuid.webp")).toEqual(Buffer.from([1, 2, 3]));
    expect(fetchMock).toHaveBeenLastCalledWith("https://res.cloudinary.com/demo-cloud/image/upload/prestafrik/abc123def456ghi789jk/uuid.webp", expect.anything());
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect(await storage.get("absent.webp")).toBeNull();
  });

  it("déplace, supprime, liste et vide un dossier", async () => {
    await storage.move("stores/abc/tmp/1-320.webp", "stores/abc/products/p1/1-320.webp");
    expect(sdk.uploader.rename).toHaveBeenCalledWith("prestafrik/stores/abc/tmp/1-320", "prestafrik/stores/abc/products/p1/1-320", expect.objectContaining({ overwrite: true }));
    await storage.delete("stores/abc/products/p1/1-320.webp");
    expect(sdk.uploader.destroy).toHaveBeenCalledWith("prestafrik/stores/abc/products/p1/1-320", expect.anything());
    expect(await storage.list("stores/abc/tmp/")).toEqual([{ key: "stores/abc/tmp/1-320.webp", lastModified: new Date("2026-10-01T10:00:00Z") }]);
    expect(sdk.api.resources).toHaveBeenCalledWith(expect.objectContaining({ prefix: "prestafrik/stores/abc/tmp/" }));
    await storage.deletePrefix("stores/abc/products/p1");
    expect(sdk.api.delete_resources_by_prefix).toHaveBeenCalledWith("prestafrik/stores/abc/products/p1/", expect.anything());
  });
});
