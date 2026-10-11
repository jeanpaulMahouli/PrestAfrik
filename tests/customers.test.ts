import { describe, expect, it } from "vitest";
import { customerSegmentLabel } from "../src/modules/customers/segmentation";
import {
  customerNameIsMateriallyDifferent,
  normalizeCustomerWhatsapp,
  parseCustomerTags,
} from "../src/modules/customers/validation";

describe("validation CRM", () => {
  it("normalise les numéros camerounais au format E.164", () => {
    expect(normalizeCustomerWhatsapp("+237 699 123 456")).toBe("+237699123456");
    expect(normalizeCustomerWhatsapp("699123456")).toBe("+237699123456");
    expect(() => normalizeCustomerWhatsapp("1234")).toThrow(/numéro WhatsApp camerounais/);
  });

  it("déduplique les tags sans tenir compte de la casse et limite leur nombre", () => {
    expect(parseCustomerTags("Fidèle, nouveau, fidèle")).toEqual(["Fidèle", "nouveau"]);
    expect(() => parseCustomerTags(Array.from({ length: 11 }, (_, i) => `tag${i}a`).join(","))).toThrow(/10 tags/);
  });

  it("signale un nom sans token commun et conserve les variantes proches", () => {
    expect(customerNameIsMateriallyDifferent("Awa Ngono", "Awa N.")).toBe(false);
    expect(customerNameIsMateriallyDifferent("Awa Ngono", "Jean Mbarga")).toBe(true);
  });
});

describe("segments des clients", () => {
  const now = new Date("2026-10-11T12:00:00Z");

  it("applique les seuils par défaut pour les clients réguliers, nouveaux et inactifs", () => {
    expect(
      customerSegmentLabel(
        {
          firstOrderAt: new Date("2026-10-01T00:00:00Z"),
          lastOrderAt: new Date("2026-10-01T00:00:00Z"),
          nonCancelledOrderCount: 1,
          nextReminderAt: null,
        },
        now,
      ),
    ).toBe("Nouveau client");
    expect(
      customerSegmentLabel(
        {
          firstOrderAt: null,
          lastOrderAt: new Date("2026-10-01T00:00:00Z"),
          nonCancelledOrderCount: 3,
          nextReminderAt: null,
        },
        now,
      ),
    ).toBe("Client régulier");
    expect(
      customerSegmentLabel(
        {
          firstOrderAt: null,
          lastOrderAt: null,
          nonCancelledOrderCount: 0,
          nextReminderAt: null,
        },
        now,
      ),
    ).toBe("Inactif");
  });
});
