-- CreateEnum
CREATE TYPE "WhatsappMode" AS ENUM ('WA_ME', 'CLOUD_API');

-- CreateEnum
CREATE TYPE "WhatsappApiStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING_TEST', 'CONNECTED', 'FAILED');

-- CreateTable
CREATE TABLE "WhatsappSettings" (
    "storeId" TEXT NOT NULL,
    "mode" "WhatsappMode" NOT NULL DEFAULT 'WA_ME',
    "businessNumber" VARCHAR(20),
    "productOrderButtonEnabled" BOOLEAN NOT NULL DEFAULT true,
    "apiPhoneNumberId" VARCHAR(40),
    "apiBusinessAccountId" VARCHAR(40),
    "apiAccessTokenEncrypted" TEXT,
    "apiTemplateName" VARCHAR(512),
    "apiTemplateLanguage" VARCHAR(10) NOT NULL DEFAULT 'fr',
    "apiWebhookSecretEncrypted" TEXT,
    "apiStatus" "WhatsappApiStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "apiDisplayPhoneNumber" VARCHAR(40),
    "apiVerifiedName" VARCHAR(120),
    "apiLastCheckedAt" TIMESTAMP(3),
    "apiLastError" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappSettings_pkey" PRIMARY KEY ("storeId")
);

-- AddForeignKey
ALTER TABLE "WhatsappSettings" ADD CONSTRAINT "WhatsappSettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

