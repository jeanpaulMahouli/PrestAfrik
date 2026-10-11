import { describe, expect, it } from "vitest";
import { buildOrderConfirmationMessage } from "../src/modules/messaging/message-content";

describe("simulation des confirmations WhatsApp", () => {
  it("construit une confirmation avec le suivi, le total et une mention de simulation", () => {
    const message = buildOrderConfirmationMessage({
      customerName: "Awa",
      storeName: "Zalam",
      reference: "PA-2026-001",
      trackingUrl: "https://prestafrik.example/commande/suivi/token",
      totalXaf: 12500,
    });

    expect(message).toContain("Awa");
    expect(message).toContain("Zalam");
    expect(message).toContain("PA-2026-001");
    expect(message).toContain("FCFA");
    expect(message).toContain("https://prestafrik.example/commande/suivi/token");
    expect(message).toContain("simulation locale");
  });

  it("ne présente pas un montant inconnu comme un paiement nul", () => {
    const message = buildOrderConfirmationMessage({
      customerName: "Awa",
      storeName: "Zalam",
      reference: "PA-2026-002",
      trackingUrl: "https://prestafrik.example/commande/suivi/token",
      totalXaf: null,
    });

    expect(message).toContain("Montant : À confirmer.");
    expect(message).not.toContain("0 FCFA");
  });
});
