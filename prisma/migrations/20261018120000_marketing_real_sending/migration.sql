-- Campagnes marketing envoyées pour de vrai (WhatsApp Cloud API), à la place du mode simulation.
ALTER TYPE "MarketingCampaignStatus" ADD VALUE 'SENT';

CREATE TYPE "MarketingDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SIMULATED');

ALTER TABLE "MarketingCampaign"
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "sentCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "failedCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "MarketingCampaignRecipient"
  ADD COLUMN "status" "MarketingDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "waMessageId" VARCHAR(128),
  ADD COLUMN "error" VARCHAR(300);

-- Les destinataires déjà enregistrés viennent de l'ancien mode simulation : aucun message réel n'est parti.
UPDATE "MarketingCampaignRecipient" SET "status" = 'SIMULATED';

CREATE INDEX "MarketingCampaignRecipient_campaignId_status_idx" ON "MarketingCampaignRecipient"("campaignId", "status");
