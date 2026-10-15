import { PaymentStatus, PaymentType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  courierBalanceContribution,
  getOrderPaymentSummary,
} from "../src/modules/payments/ledger";

describe("journal des paiements", () => {
  it("calcule les soldes reçus, restant dû et statut sans compter les reversements internes", () => {
    const summary = getOrderPaymentSummary(
      [
        { type: PaymentType.PAYMENT_RECEIVED, amountXaf: 12000 },
        { type: PaymentType.COURIER_COLLECTION, amountXaf: 5000 },
        { type: PaymentType.SETTLEMENT, amountXaf: 3000 },
      ],
      20000,
    );
    expect(summary).toEqual({
      paidXaf: 17000,
      remainingXaf: 3000,
      status: PaymentStatus.PARTIAL,
    });
    expect(
      courierBalanceContribution({
        type: PaymentType.COURIER_COLLECTION,
        amountXaf: 5000,
      }) +
        courierBalanceContribution({
          type: PaymentType.SETTLEMENT,
          amountXaf: 3000,
        }),
    ).toBe(2000);
  });

  it("comptabilise une écriture inverse et garde le statut payé cohérent", () => {
    expect(
      getOrderPaymentSummary(
        [
          { type: PaymentType.PAYMENT_RECEIVED, amountXaf: 10000 },
          {
            type: PaymentType.REVERSAL,
            amountXaf: 10000,
            reverses: {
              type: PaymentType.PAYMENT_RECEIVED,
              amountXaf: 10000,
            },
          },
        ],
        10000,
      ),
    ).toMatchObject({ paidXaf: 0, status: PaymentStatus.PENDING });
    expect(
      getOrderPaymentSummary(
        [{ type: PaymentType.PAYMENT_RECEIVED, amountXaf: 10000 }],
        10000,
      ).status,
    ).toBe(PaymentStatus.PAID);
  });

  it("recalcule le statut après remboursement et annulation d’un remboursement", () => {
    expect(
      getOrderPaymentSummary(
        [
          { type: PaymentType.PAYMENT_RECEIVED, amountXaf: 10000 },
          { type: PaymentType.REFUND, amountXaf: 10000 },
        ],
        10000,
      ),
    ).toMatchObject({ paidXaf: 0, status: PaymentStatus.REFUNDED });
    expect(
      getOrderPaymentSummary(
        [
          { type: PaymentType.PAYMENT_RECEIVED, amountXaf: 10000 },
          { type: PaymentType.REFUND, amountXaf: 10000 },
          {
            type: PaymentType.REVERSAL,
            amountXaf: 10000,
            reverses: { type: PaymentType.REFUND, amountXaf: 10000 },
          },
        ],
        10000,
      ),
    ).toMatchObject({ paidXaf: 10000, status: PaymentStatus.PAID });
  });
});
