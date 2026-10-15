-- Date réelle d'encaissement, distincte de la date de saisie (brief §6.9 : jamais future).
ALTER TABLE "Payment" ADD COLUMN "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Payment" SET "receivedAt" = "createdAt";
CREATE INDEX "Payment_storeId_receivedAt_idx" ON "Payment"("storeId", "receivedAt");
