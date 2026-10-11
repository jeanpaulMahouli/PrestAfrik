import { OrderConfirmationStatus, OrderProcessingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { isPendingReview, orderStatusTransition } from "../src/modules/orders/status";

describe("transitions d’état des commandes", () => {
  it("confirme ou refuse une commande en attente", () => {
    expect(
      orderStatusTransition(
        OrderConfirmationStatus.PENDING,
        OrderProcessingStatus.TO_REVIEW,
        "accept",
      ),
    ).toEqual({
      confirmationStatus: OrderConfirmationStatus.CONFIRMED,
      processingStatus: OrderProcessingStatus.ACCEPTED,
    });
    expect(
      orderStatusTransition(
        OrderConfirmationStatus.PENDING,
        OrderProcessingStatus.TO_REVIEW,
        "decline",
      ),
    ).toEqual({
      confirmationStatus: OrderConfirmationStatus.DECLINED,
      processingStatus: OrderProcessingStatus.CANCELLED,
    });
  });

  it("autorise uniquement les étapes valides de préparation et d’annulation", () => {
    expect(
      orderStatusTransition(
        OrderConfirmationStatus.CONFIRMED,
        OrderProcessingStatus.ACCEPTED,
        "prepare",
      )?.processingStatus,
    ).toBe(OrderProcessingStatus.PREPARING);
    expect(
      orderStatusTransition(
        OrderConfirmationStatus.CONFIRMED,
        OrderProcessingStatus.PREPARING,
        "complete",
      )?.processingStatus,
    ).toBe(OrderProcessingStatus.COMPLETED);
    expect(
      orderStatusTransition(
        OrderConfirmationStatus.CONFIRMED,
        OrderProcessingStatus.PREPARING,
        "cancel",
      )?.processingStatus,
    ).toBe(OrderProcessingStatus.CANCELLED);
    expect(
      orderStatusTransition(
        OrderConfirmationStatus.CONFIRMED,
        OrderProcessingStatus.COMPLETED,
        "cancel",
      ),
    ).toBeNull();
  });

  it("détecte une commande à confirmer sans rendre les commandes terminales modifiables", () => {
    expect(
      isPendingReview(
        OrderConfirmationStatus.PENDING,
        OrderProcessingStatus.TO_REVIEW,
      ),
    ).toBe(true);
    expect(
      isPendingReview(
        OrderConfirmationStatus.DECLINED,
        OrderProcessingStatus.CANCELLED,
      ),
    ).toBe(false);
    expect(
      orderStatusTransition(
        OrderConfirmationStatus.DECLINED,
        OrderProcessingStatus.CANCELLED,
        "accept",
      ),
    ).toBeNull();
  });
});
