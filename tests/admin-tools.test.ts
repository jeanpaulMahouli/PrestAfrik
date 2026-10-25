import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { normalizeMessage, notificationFingerprint } = await import("@/modules/system/notifications");
const { parseProspectionFilters, prospectStatus, prospectWhatsappUrl } = await import("@/modules/admin/prospection");
const { assistanceCriteria } = await import("@/config/prospection");

describe("notifications techniques", () => {
  it("retire les données personnelles et regroupe les erreurs identiques", () => {
    expect(normalizeMessage("Échec pour awa@example.com au +237 699 00 00 00")).toBe("Échec pour <e-mail> au <numéro>");
    const a = notificationFingerprint("server-error", "Commande cmvn62def000ax11c6xhyuxp7 introuvable");
    const b = notificationFingerprint("server-error", "Commande cmv93diqm000ax1j8za99g0qg introuvable");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(notificationFingerprint("email", "Commande x introuvable")).not.toBe(notificationFingerprint("upload", "Commande x introuvable"));
  });
});

describe("prospection", () => {
  const row = { phoneDigits: "237699000000", firstName: "Awa", storeName: "Mboa Style" };

  it("lit les filtres combinables et ignore les valeurs inconnues", () => {
    expect(parseProspectionFilters(["assistance", "actifs", "pirate"])).toEqual(["actifs", "assistance"]);
    expect(parseProspectionFilters("non-publiee")).toEqual(["non-publiee"]);
    expect(parseProspectionFilters(undefined)).toEqual([]);
  });

  it("prépare un lien wa.me sans + ni espaces, avec le message du filtre", () => {
    const url = new URL(prospectWhatsappUrl(row, ["assistance"])!);
    expect(url.origin + url.pathname).toBe("https://wa.me/237699000000");
    expect(url.searchParams.get("text")).toBe(
      "Bonjour Awa, c’est l’équipe PrestAfrik ! Nous avons vu que votre boutique « Mboa Style » est presque prête. Pouvons-nous vous aider à la finaliser ?",
    );
    expect(new URL(prospectWhatsappUrl(row, ["non-publiee"])!).searchParams.get("text")).toContain("n’est pas encore en ligne");
    expect(prospectWhatsappUrl({ ...row, phoneDigits: null }, [])).toBeNull();
  });

  it("affiche un statut clair et liste ce qui manque", () => {
    expect(prospectStatus({ suspended: true, emailVerified: true, active: true }).label).toBe("Suspendu");
    expect(prospectStatus({ suspended: false, emailVerified: false, active: true }).label).toBe("E-mail non confirmé");
    expect(prospectStatus({ suspended: false, emailVerified: true, active: false }).label).toBe("Inactif");
    const store = { name: "Test", activeProducts: 0, hasLogo: false, hasWhatsapp: true, deliveryZones: 0, pickupEnabled: true };
    expect(assistanceCriteria.filter((criterion) => criterion.isMissing(store)).map((criterion) => criterion.key)).toEqual(["produit", "logo"]);
  });
});
