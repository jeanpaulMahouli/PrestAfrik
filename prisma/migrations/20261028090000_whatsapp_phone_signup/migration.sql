-- Inscription par WhatsApp : numéro du compte et codes à usage unique.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "phoneNumber" VARCHAR(20),
ADD COLUMN "phoneNumberVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateEnum
CREATE TYPE "PhoneVerificationPurpose" AS ENUM ('SIGN_UP', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "PhoneVerification" (
    "id" TEXT NOT NULL,
    "purpose" "PhoneVerificationPurpose" NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "name" VARCHAR(80),
    "passwordHash" TEXT,
    "codeHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sendCount" INTEGER NOT NULL DEFAULT 1,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "messageId" VARCHAR(128),
    "deliveryStatus" VARCHAR(20),
    "deliveryError" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhoneVerification_purpose_phoneNumber_key" ON "PhoneVerification"("purpose", "phoneNumber");

-- CreateIndex
CREATE INDEX "PhoneVerification_messageId_idx" ON "PhoneVerification"("messageId");
