import { describe, expect, it } from "vitest";
import { canCancel, canValidate, orderStage } from "../src/modules/orders/state-machine";

describe("cycle de vie simplifié d’une commande", () => {
  it("ramène les anciens statuts de traitement à « Nouvelle »", () => {
    for (const status of ["TO_REVIEW", "ACCEPTED", "PREPARING"] as const) expect(orderStage(status)).toBe("NEW");
    expect(orderStage("COMPLETED")).toBe("VALIDATED");
    expect(orderStage("CANCELLED")).toBe("CANCELLED");
  });

  it("valide seulement une nouvelle commande", () => {
    expect(canValidate("NEW")).toBe(true);
    expect(canValidate("VALIDATED")).toBe(false);
    expect(canValidate("CANCELLED")).toBe(false);
  });

  it("annule une commande nouvelle ou validée, pas deux fois", () => {
    expect(canCancel("NEW")).toBe(true);
    expect(canCancel("VALIDATED")).toBe(true);
    expect(canCancel("CANCELLED")).toBe(false);
  });
});
