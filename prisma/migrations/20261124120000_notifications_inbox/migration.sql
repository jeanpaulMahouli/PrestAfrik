-- Centre de notifications des vendeurs, préférences, astuces, suivi de prospection, boîte de réception.

ALTER TYPE "PushNotificationKind" ADD VALUE 'TIP';

CREATE TYPE "VendorNotificationKind" AS ENUM ('ORDER', 'MESSAGE', 'NEWS', 'TIP', 'ALERT');

ALTER TABLE "User"
  ADD COLUMN "notifyTips" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyNews" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "lastTipAt" TIMESTAMP(3),
  ADD COLUMN "tipIndex" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "VendorNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "VendorNotificationKind" NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "body" VARCHAR(400) NOT NULL,
  "url" VARCHAR(200),
  "imageUrl" VARCHAR(500),
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VendorNotification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VendorNotification_userId_createdAt_idx" ON "VendorNotification"("userId", "createdAt");
CREATE INDEX "VendorNotification_userId_readAt_idx" ON "VendorNotification"("userId", "readAt");
CREATE INDEX "VendorNotification_createdAt_idx" ON "VendorNotification"("createdAt");
ALTER TABLE "VendorNotification" ADD CONSTRAINT "VendorNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProspectContact" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "adminId" TEXT,
  "channel" VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  "note" VARCHAR(300),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProspectContact_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProspectContact_userId_createdAt_idx" ON "ProspectContact"("userId", "createdAt");
ALTER TABLE "ProspectContact" ADD CONSTRAINT "ProspectContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProspectContact" ADD CONSTRAINT "ProspectContact_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PushNotificationLog" ADD COLUMN "audience" VARCHAR(30);

-- Boîte de réception : date du dernier message (demandes existantes : dernière réponse, sinon création).
ALTER TABLE "SupportTicket" ADD COLUMN "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "SupportTicket" t SET "lastMessageAt" = COALESCE((SELECT MAX(m."createdAt") FROM "SupportTicketMessage" m WHERE m."ticketId" = t."id"), t."createdAt");
CREATE INDEX "SupportTicket_lastMessageAt_idx" ON "SupportTicket"("lastMessageAt");

-- Produits masqués de la marketplace par l'administration (Administration → Produits).
ALTER TABLE "Product"
  ADD COLUMN "marketplaceHiddenAt" TIMESTAMP(3),
  ADD COLUMN "marketplaceHiddenBy" VARCHAR(120),
  ADD COLUMN "marketplaceHiddenReason" VARCHAR(200);
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");
