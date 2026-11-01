-- Marketplace : bannière mobile à part, bouton sur les bannières, image des catégories, bandeau publicitaire.
ALTER TYPE "AnnouncementPlacement" ADD VALUE IF NOT EXISTS 'SHOP_MOBILE';

ALTER TABLE "PlatformAnnouncement" ADD COLUMN "ctaLabel" VARCHAR(40);

ALTER TABLE "Activity" ADD COLUMN "imageUrl" TEXT;

CREATE TABLE "MarketplaceTicker" (
  "id" TEXT NOT NULL,
  "text" VARCHAR(140) NOT NULL,
  "linkUrl" VARCHAR(500),
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceTicker_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketplaceTicker_active_position_idx" ON "MarketplaceTicker"("active", "position");
