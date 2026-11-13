-- Crédits de l'assistant IA : 5 par mois par boutique (réglable), crédits bonus de l'administration,
-- historique des demandes et des attributions. La RLS est activée automatiquement sur les nouvelles tables.

-- CreateEnum
CREATE TYPE "AiCreditSource" AS ENUM ('MONTHLY', 'BONUS');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "aiMonthlyCredits" INTEGER,
ADD COLUMN "aiBonusCredits" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AiCreditUse" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT,
    "source" "AiCreditSource" NOT NULL,
    "feature" VARCHAR(40) NOT NULL DEFAULT 'product-text',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCreditUse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCreditGrant" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCreditGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiCreditUse_storeId_source_createdAt_idx" ON "AiCreditUse"("storeId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "AiCreditGrant_storeId_createdAt_idx" ON "AiCreditGrant"("storeId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiCreditUse" ADD CONSTRAINT "AiCreditUse_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCreditGrant" ADD CONSTRAINT "AiCreditGrant_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
