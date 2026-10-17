import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const findUnique = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { whatsappSettings: { findUnique } } }));
vi.mock("@/lib/secret-box", () => ({ decryptSecret: (value: string) => `clair:${value}` }));

const { getCampaignSender } = await import("@/modules/marketing/sender");
const { sendTemplateMessage } = await import("@/modules/whatsapp/cloud-api");

const connected = {
  apiPhoneNumberId: "123",
  apiAccessTokenEncrypted: "chiffre",
  apiStatus: "CONNECTED",
  mode: "CLOUD_API",
  apiTemplateName: "offre_boutique",
  apiTemplateLanguage: "fr",
  apiLastError: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
  findUnique.mockReset();
});

describe("envoi des campagnes : API WhatsApp", () => {
  it("explique clairement quand l'API WhatsApp n'est pas configurée", async () => {
    findUnique.mockResolvedValue(null);
    const result = await getCampaignSender("boutique");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(/API WhatsApp n’est pas configurée/);
  });

  it("refuse l'envoi tant que l'API n'est pas activée, ou sans modèle de message", async () => {
    findUnique.mockResolvedValue({ ...connected, mode: "WA_ME", apiStatus: "PENDING_TEST" });
    expect((await getCampaignSender("boutique")).ok).toBe(false);
    findUnique.mockResolvedValue({ ...connected, apiTemplateName: null });
    const noTemplate = await getCampaignSender("boutique");
    expect(!noTemplate.ok && noTemplate.reason).toMatch(/modèle de message/);
  });

  it("est prêt quand l'API est connectée et qu'un modèle est indiqué", async () => {
    findUnique.mockResolvedValue(connected);
    expect(await getCampaignSender("boutique")).toEqual({ ok: true, phoneNumberId: "123", accessToken: "clair:chiffre", templateName: "offre_boutique", language: "fr" });
  });
});

describe("envoi d'un modèle de message par la Cloud API", () => {
  const input = { phoneNumberId: "123", accessToken: "jeton", to: "+237699000000", templateName: "offre_boutique", language: "fr", bodyText: "Promo !\nJusqu’à -20 %" };

  it("envoie le texte de la campagne dans la variable {{1}} du modèle", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendTemplateMessage(input)).toEqual({ ok: true, messageId: "wamid.1" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.to).toBe("237699000000");
    expect(body.template.name).toBe("offre_boutique");
    expect(body.template.components[0].parameters[0].text).toBe("Promo ! · Jusqu’à -20 %");
  });

  it("traduit les erreurs de Meta et distingue celles qui arrêtent l'envoi", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 131026 } }), { status: 400 })));
    expect(await sendTemplateMessage(input)).toMatchObject({ ok: false, fatal: false, error: expect.stringMatching(/n’utilise pas WhatsApp/) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 132001 } }), { status: 404 })));
    expect(await sendTemplateMessage(input)).toMatchObject({ ok: false, fatal: true, error: expect.stringMatching(/modèle de message est introuvable/) });
  });
});
