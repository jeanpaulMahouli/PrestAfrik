import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { isQuietHour } = await import("@/modules/push/triggers");
const { conversationOf, vendorStatusLabels, teamStatusLabels } = await import("@/modules/support/conversation");
const { vendorTips } = await import("@/config/tips");
const { quickReplies } = await import("@/config/quick-replies");

describe("heures calmes (Douala, UTC+1)", () => {
  it("rien d'automatique entre 20 h et 9 h", () => {
    expect(isQuietHour(new Date("2026-11-24T19:30:00Z"))).toBe(true); // 20 h 30 à Douala
    expect(isQuietHour(new Date("2026-11-24T07:59:00Z"))).toBe(true); // 8 h 59
    expect(isQuietHour(new Date("2026-11-24T08:00:00Z"))).toBe(false); // 9 h
    expect(isQuietHour(new Date("2026-11-24T18:59:00Z"))).toBe(false); // 19 h 59
  });
});

describe("conversation", () => {
  const ticket = {
    id: "ticket1234567",
    message: "Comment publier ma boutique ?",
    requesterName: "Aïcha",
    requesterId: "vendor1234567",
    createdAt: new Date("2026-11-20T10:00:00Z"),
    replies: [
      { id: "r1", body: "Ajoutez un produit.", createdAt: new Date("2026-11-20T11:00:00Z"), authorId: "admin12345678", author: { name: "Equipe" } },
      { id: "r2", body: "Merci !", createdAt: new Date("2026-11-20T12:00:00Z"), authorId: "vendor1234567", author: { name: "Aïcha" } },
    ],
  };

  it("la demande d'origine vient du vendeur, puis chaque réponse est attribuée à son auteur", () => {
    const messages = conversationOf(ticket);
    expect(messages.map((message) => message.fromTeam)).toEqual([false, true, false]);
    expect(messages[2].author).toBe("Aïcha");
  });

  it("les statuts disent qui doit répondre", () => {
    expect(vendorStatusLabels.IN_PROGRESS).toBe("Réponse reçue");
    expect(teamStatusLabels.OPEN).toBe("À traiter");
  });
});

describe("astuces et réponses rapides", () => {
  it("chaque astuce mène à une page du tableau de bord, sans doublon", () => {
    expect(vendorTips.length).toBeGreaterThanOrEqual(10);
    for (const tip of vendorTips) expect(tip.url).toMatch(/^\/dashboard/);
    expect(new Set(vendorTips.map((tip) => tip.title)).size).toBe(vendorTips.length);
  });

  it("les réponses rapides saluent le vendeur par son prénom", () => {
    for (const reply of quickReplies) expect(reply.body).toContain("{prenom}");
  });
});
